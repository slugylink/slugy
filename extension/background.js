/**
 * Slugy extension background worker.
 *
 * Auth uses a tab-based handshake that works on both https and local
 * development (http://app.localhost:3000), where `launchWebAuthFlow` would
 * reject the URL as insecure:
 *
 *   1. Popup asks the background to start a connection.
 *   2. Background opens the app's /api/extension/connect in a new tab.
 *   3. Once the dashboard session is confirmed, that route redirects the tab
 *      to /extension/authorize#token=... .
 *   4. The content script on that page forwards the fragment here, we persist
 *      it, and the tab is closed.
 */

// Chrome service workers need to pull in the shared config explicitly.
if (typeof importScripts === "function" && !globalThis.SLUGY_CONFIG) {
  importScripts("config.js");
}

const { appUrl, connectPath } = globalThis.SLUGY_CONFIG ?? {
  appUrl: "https://app.slugy.co",
  connectPath: "/api/extension/connect",
};

const SESSION_KEY = "slugySession";
const STATE_KEY = "slugyPendingState";
const ERROR_KEY = "slugyLastError";

// Firefox exposes the promise-based `browser` namespace.
const api = globalThis.browser ?? globalThis.chrome;
const isFirefox = typeof globalThis.browser !== "undefined";

function getStorage() {
  return api.storage.local;
}

async function storageGet(key) {
  try {
    const result = await getStorage().get([key]);
    return result?.[key] ?? null;
  } catch {
    return null;
  }
}

async function storageSet(values) {
  await getStorage().set(values);
}

async function storageRemove(keys) {
  await getStorage().remove(keys);
}

function createState() {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function startConnect() {
  const state = createState();

  const connectUrl = new URL(`${appUrl}${connectPath}`);
  connectUrl.searchParams.set("state", state);

  await storageSet({ [STATE_KEY]: { state, createdAt: Date.now() } });
  await storageRemove([ERROR_KEY]);

  await api.tabs.create({ url: connectUrl.toString(), active: true });

  return { ok: true, pending: true };
}

async function handleAuthResult(params = {}) {
  const expectedState = await storageGet(STATE_KEY);

  if (
    !expectedState?.state ||
    !params.state ||
    params.state !== expectedState.state ||
    Date.now() - expectedState.createdAt > 15 * 60 * 1000
  ) {
    await storageSet({ [ERROR_KEY]: "auth_failed" });
    return { ok: false, error: "auth_failed" };
  }

  if (params.error) {
    await storageSet({ [ERROR_KEY]: params.error });
    await storageRemove([STATE_KEY]);
    return { ok: false, error: params.error };
  }

  const token = params.token;
  if (typeof token !== "string" || !token.startsWith("slugy_")) {
    await storageSet({ [ERROR_KEY]: "auth_failed" });
    return { ok: false, error: "auth_failed" };
  }

  const workspaces = params.workspaces
    ? JSON.parse(params.workspaces)
    : [
        {
          token,
          workspace: params.workspace ?? "",
          workspaceName: params.workspace_name ?? "",
        },
      ];
  if (
    !Array.isArray(workspaces) ||
    !workspaces.length ||
    workspaces.some(
      (item) =>
        !item ||
        typeof item.workspace !== "string" ||
        typeof item.workspaceName !== "string" ||
        typeof item.token !== "string" ||
        !item.token.startsWith("slugy_"),
    ) ||
    new Set(workspaces.map((item) => item.workspace)).size !== workspaces.length
  ) {
    return { ok: false, error: "auth_failed" };
  }
  const previous = await storageGet(SESSION_KEY);
  const selected =
    workspaces.find((item) => item.workspace === previous?.workspace) ??
    workspaces[0];
  const session = {
    token: selected.token,
    workspace: selected.workspace,
    workspaceName: selected.workspaceName,
    workspaces,
    name: params.name ?? "",
    email: params.email ?? "",
    image: params.image ?? "",
    createdAt: Date.now(),
  };

  await storageSet({ [SESSION_KEY]: session });
  await storageRemove([ERROR_KEY, STATE_KEY]);

  return { ok: true };
}

async function handleMessage(message, sender) {
  if (sender?.id !== api.runtime.id) {
    return { ok: false, error: "auth_failed" };
  }
  if (message?.type === "AUTH_RESULT") {
    const callback = new URL(sender.url || "about:blank");
    if (
      sender.tab?.id == null ||
      sender.frameId !== 0 ||
      callback.origin !== new URL(appUrl).origin ||
      callback.pathname !== "/extension/authorize"
    ) {
      return { ok: false, error: "auth_failed" };
    }
  } else if (sender.url !== api.runtime.getURL("popup.html")) {
    return { ok: false, error: "auth_failed" };
  }
  switch (message?.type) {
    case "START_CONNECT":
      return startConnect();
    case "AUTH_RESULT":
      return handleAuthResult(message.params);
    case "GET_SESSION": {
      const session = await storageGet(SESSION_KEY);
      const error = await storageGet(ERROR_KEY);
      return { ok: true, session, error };
    }
    case "SELECT_WORKSPACE": {
      const session = await storageGet(SESSION_KEY);
      const selected = session?.workspaces?.find(
        (item) => item.workspace === message.workspace,
      );
      if (!selected) return { ok: false, error: "no_workspace" };
      const updated = {
        ...session,
        token: selected.token,
        workspace: selected.workspace,
        workspaceName: selected.workspaceName,
      };
      await storageSet({ [SESSION_KEY]: updated });
      return { ok: true, session: updated };
    }
    case "SIGN_OUT":
      await storageRemove([SESSION_KEY, ERROR_KEY, STATE_KEY]);
      return { ok: true };
    default:
      return { ok: false, error: "unknown_message" };
  }
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const task = handleMessage(message, sender)
    .then((response) => {
      // The authorize tab has done its job once the result is stored.
      if (
        response.ok &&
        message?.type === "AUTH_RESULT" &&
        sender?.tab?.id != null
      ) {
        try {
          Promise.resolve(api.tabs.remove(sender.tab.id)).catch(() => {});
        } catch {
          // Ignore: the tab may already be gone.
        }
      }
      return response;
    })
    .catch((error) => {
      console.error("Slugy: background error", error);
      return { ok: false, error: "unexpected_error" };
    });

  // Firefox supports Promise-returning listeners; Chrome needs sendResponse.
  if (isFirefox) return task;

  task.then(sendResponse);
  return true;
});
