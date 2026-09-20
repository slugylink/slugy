const DEFAULT_API_URL = "https://app.slugy.co/api/v1/link";
// const DEFAULT_API_URL = "http://localhost:3000/api/v1/link";

const form = document.querySelector("#shorten-form");
const urlInput = document.querySelector("#url");
const slugInput = document.querySelector("#slug");
const apiKeyInput = document.querySelector("#api-key");
const settings = document.querySelector("#settings");
const shortenButton = document.querySelector("#shorten");
const message = document.querySelector("#message");
const result = document.querySelector("#result");
const shortUrlInput = document.querySelector("#short-url");
const apiKeyStatus = document.querySelector("#api-key-status");

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`;
}

function getApiKey() {
  return chrome.storage.session.get({ apiKey: "" });
}

async function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    settings.open = true;
    setMessage("Enter a workspace API key first.", "error");
    apiKeyInput.focus();
    return false;
  }

  await chrome.storage.session.set({ apiKey });
  apiKeyInput.value = "";
  apiKeyStatus.textContent = "API key saved for this Chrome session.";
  setMessage("API key saved securely for this session.", "success");
  return true;
}

async function initialize() {
  await chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_CONTEXTS",
  });
  const { apiKey } = await getApiKey();
  apiKeyStatus.textContent = apiKey
    ? "An API key is saved for this Chrome session."
    : "No API key is saved for this session.";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url?.startsWith("http")) urlInput.value = tab.url;
  if (!apiKey) settings.open = true;
}

document
  .querySelector("#save-settings")
  .addEventListener("click", saveSettings);
document
  .querySelector("#clear-settings")
  .addEventListener("click", async () => {
    await chrome.storage.session.remove("apiKey");
    apiKeyInput.value = "";
    apiKeyStatus.textContent = "No API key is saved for this session.";
    setMessage("API key removed from this Chrome session.", "success");
  });

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const { apiKey } = await getApiKey();
  if (!apiKey) {
    settings.open = true;
    setMessage("Save a workspace API key before shortening links.", "error");
    return;
  }

  shortenButton.disabled = true;
  result.classList.add("hidden");
  setMessage("Creating short link...");
  try {
    const response = await fetch(DEFAULT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: urlInput.value.trim(),
        slug: slugInput.value.trim() || undefined,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        payload.error?.message ||
          payload.error ||
          "Could not create the short link.",
      );

    const shortUrl = payload.data?.shortUrl || payload.shortUrl;
    if (!shortUrl) throw new Error("The server did not return a short link.");

    shortUrlInput.value = shortUrl;
    result.classList.remove("hidden");
    setMessage("Short link created in this workspace.", "success");
  } catch (error) {
    setMessage(
      error instanceof Error
        ? error.message
        : "Could not create the short link.",
      "error",
    );
  } finally {
    shortenButton.disabled = false;
  }
});

document.querySelector("#copy").addEventListener("click", async () => {
  await navigator.clipboard.writeText(shortUrlInput.value);
  setMessage("Short link copied.", "success");
});

initialize().catch(() =>
  setMessage("Could not read extension settings.", "error"),
);
