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
  try {
    await getStorage().set(values);
  } catch (error) {
    console.error("Slugy: storage write failed", error);
  }
}

async function storageRemove(keys) {
  try {
    await getStorage().remove(keys);
  } catch (error) {
    console.error("Slugy: storage remove failed", error);
  }
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

  await storageSet({ [STATE_KEY]: state });
  await storageRemove([ERROR_KEY]);

  await api.tabs.create({ url: connectUrl.toString(), active: true });

  return { ok: true, pending: true };
}

async function handleAuthResult(params = {}) {
  const expectedState = await storageGet(STATE_KEY);

  if (expectedState && params.state && params.state !== expectedState) {
    await storageSet({ [ERROR_KEY]: "auth_failed" });
    return { ok: false, error: "auth_failed" };
  }

  await storageRemove([STATE_KEY]);

  if (params.error) {
    await storageSet({ [ERROR_KEY]: params.error });
    return { ok: false, error: params.error };
  }

  const token = params.token;
  if (!token) {
    await storageSet({ [ERROR_KEY]: "auth_failed" });
    return { ok: false, error: "auth_failed" };
  }

  const session = {
    token,
    workspace: params.workspace ?? "",
    workspaceName: params.workspace_name ?? "",
    name: params.name ?? "",
    email: params.email ?? "",
    image: params.image ?? "",
    createdAt: Date.now(),
  };

  await storageSet({ [SESSION_KEY]: session });
  await storageRemove([ERROR_KEY]);

  return { ok: true, session };
}

async function handleMessage(message) {
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
    case "SIGN_OUT":
      await storageRemove([SESSION_KEY, ERROR_KEY, STATE_KEY]);
      return { ok: true };
    default:
      return { ok: false, error: "unknown_message" };
  }
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const task = handleMessage(message)
    .then((response) => {
      // The authorize tab has done its job once the result is stored.
      if (message?.type === "AUTH_RESULT" && sender?.tab?.id != null) {
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
