/* global SLUGY_CONFIG */
const { appUrl, createLinkPath, dashboardPath } = globalThis.SLUGY_CONFIG ?? {};

const api = globalThis.browser ?? globalThis.chrome;

const el = (id) => document.getElementById(id);

const dom = {
  authView: el("auth-view"),
  appView: el("app-view"),
  menuButton: el("menu-button"),
  menu: el("menu"),
  menuEmail: el("menu-email"),
  connectButton: el("connect-button"),
  authHint: el("auth-hint"),
  urlInput: el("url-input"),
  resetUrl: el("reset-url"),
  contextText: el("context-text"),
  aliasToggle: el("alias-toggle"),
  aliasField: el("alias-field"),
  aliasInput: el("alias-input"),
  aliasDomain: el("alias-domain"),
  shortenButton: el("shorten-button"),
  shortenLabel: el("shorten-label"),
  shortenSpinner: el("shorten-spinner"),
  status: el("status"),
};

let session = null;
let tabUrl = "";
let busy = false;

/* ---------- helpers ---------- */

async function sendMessage(message) {
  try {
    return await api.runtime.sendMessage(message);
  } catch {
    return { ok: false, error: "unexpected_error" };
  }
}

function setStatus(message, type) {
  if (!message) {
    dom.status.hidden = true;
    dom.status.textContent = "";
    dom.status.className = "status";
    return;
  }
  dom.status.textContent = message;
  dom.status.className = `status status-${type ?? "error"}`;
  dom.status.hidden = false;
}

function errorMessage(code) {
  switch (code) {
    case "no_workspace":
      return "No workspace found. Create one on the dashboard first.";
    case "auth_failed":
      return "Sign in failed. Please try again.";
    case "cancelled":
      return "Sign in was cancelled.";
    default:
      return "Something went wrong. Please try again.";
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(helper);
    return ok;
  }
}

async function getActiveTabUrl() {
  try {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    const url = tabs?.[0]?.url ?? "";
    return /^https?:\/\//i.test(url) ? url : "";
  } catch {
    return "";
  }
}

/* ---------- rendering ---------- */

function render() {
  if (session?.token) {
    dom.authView.hidden = true;
    dom.appView.hidden = false;
    dom.menuEmail.textContent = session.email || session.name || "";
    dom.aliasDomain.textContent = "slugy.co/";
    dom.contextText.textContent = session.workspaceName
      ? `Workspace · ${session.workspaceName}`
      : "Plain short link";
    if (!dom.urlInput.value) dom.urlInput.value = tabUrl;
  } else {
    dom.appView.hidden = true;
    dom.authView.hidden = false;
    closeMenu();
  }
}

function setBusy(next) {
  busy = next;
  dom.shortenButton.disabled = next;
  dom.shortenSpinner.hidden = !next;
  dom.shortenLabel.textContent = next ? "Shortening…" : "Shorten & copy";
}

function openMenu() {
  dom.menu.hidden = false;
  dom.menuButton.setAttribute("aria-expanded", "true");
}

function closeMenu() {
  dom.menu.hidden = true;
  dom.menuButton.setAttribute("aria-expanded", "false");
}

/* ---------- auth ---------- */

async function startConnect() {
  dom.connectButton.disabled = true;
  setStatus("");

  const response = await sendMessage({ type: "START_CONNECT" });

  dom.connectButton.disabled = false;

  if (response?.ok) {
    dom.authHint.textContent =
      "Finish confirming in the tab that just opened, then reopen Slugy.";
  } else {
    setStatus(errorMessage(response?.error), "error");
  }
}

async function signOut() {
  await sendMessage({ type: "SIGN_OUT" });
  session = null;
  dom.urlInput.value = "";
  dom.aliasInput.value = "";
  dom.aliasField.hidden = true;
  setStatus("");
  render();
}

async function openDashboard() {
  try {
    await api.tabs.create({ url: `${appUrl}${dashboardPath ?? "/"}` });
  } finally {
    window.close();
  }
}

/* ---------- shorten ---------- */

async function shorten() {
  if (busy || !session?.token) return;

  const url = dom.urlInput.value.trim();
  if (!url) {
    setStatus("Enter a link to shorten.", "error");
    dom.urlInput.focus();
    return;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
  } catch {
    setStatus("Enter a valid http(s) URL.", "error");
    dom.urlInput.focus();
    return;
  }

  const alias = dom.aliasInput.value.trim();
  if (alias && alias.length < 3) {
    setStatus("Alias must be at least 3 characters.", "error");
    dom.aliasInput.focus();
    return;
  }

  const body = { url };
  if (alias) body.slug = alias;

  setBusy(true);
  setStatus("");

  try {
    const response = await fetch(`${appUrl}${createLinkPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);

    if (response.status === 401) {
      await signOut();
      setStatus("Your session expired. Please reconnect.", "error");
      return;
    }

    if (!response.ok || !payload?.success) {
      setStatus(payload?.error || "Could not shorten that link.", "error");
      return;
    }

    const shortUrl = payload.data?.shortUrl;
    if (!shortUrl) {
      setStatus("Link created, but no short URL was returned.", "error");
      return;
    }

    const copied = await copyText(shortUrl);
    setStatus(
      copied ? `Copied ${shortUrl}` : `Created ${shortUrl} (copy failed)`,
      copied ? "success" : "error",
    );
    dom.shortenButton.classList.add("is-success");
    dom.shortenLabel.textContent = "Copied!";
    setTimeout(() => {
      dom.shortenButton.classList.remove("is-success");
      dom.shortenLabel.textContent = "Shorten & copy";
    }, 1600);
  } catch (error) {
    console.error("Slugy: shorten failed", error);
    setStatus("Network error. Please try again.", "error");
  } finally {
    setBusy(false);
  }
}

/* ---------- events ---------- */

dom.connectButton.addEventListener("click", startConnect);

dom.resetUrl.addEventListener("click", () => {
  dom.urlInput.value = tabUrl;
  setStatus("");
});

dom.aliasToggle.addEventListener("click", () => {
  const show = dom.aliasField.hidden;
  dom.aliasField.hidden = !show;
  dom.aliasToggle.textContent = show ? "− Hide custom alias" : "+ Custom alias";
  if (show) dom.aliasInput.focus();
});

dom.shortenButton.addEventListener("click", shorten);

dom.urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") shorten();
});

dom.menuButton.addEventListener("click", (event) => {
  event.stopPropagation();
  if (dom.menu.hidden) openMenu();
  else closeMenu();
});

dom.menu.addEventListener("click", (event) => {
  const action = event.target?.dataset?.action;
  if (!action) return;
  if (action === "dashboard") openDashboard();
  if (action === "shortcut") {
    const url = navigator.userAgent.includes("Firefox")
      ? "about:addons"
      : "chrome://extensions/shortcuts";
    api.tabs.create({ url }).catch(() => {});
    window.close();
  }
  if (action === "signout") signOut();
});

document.addEventListener("click", (event) => {
  if (
    !dom.menu.hidden &&
    !dom.menu.contains(event.target) &&
    event.target !== dom.menuButton
  ) {
    closeMenu();
  }
});

// Update live if the popup stays open while the callback tab completes.
api.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.slugySession) return;
  session = changes.slugySession.newValue ?? null;
  render();
});

/* ---------- init ---------- */

(async function init() {
  const [stored, currentUrl] = await Promise.all([
    sendMessage({ type: "GET_SESSION" }),
    getActiveTabUrl(),
  ]);

  session = stored?.session ?? null;
  tabUrl = currentUrl;
  render();

  if (!session?.token && stored?.error) {
    setStatus(errorMessage(stored.error), "error");
  }
})();
