/**
 * Runs on the app's /extension/authorize page (dashboard origin). It reads the
 * token from the URL fragment and forwards it to the background worker, which
 * persists the session and closes this tab.
 */
const api = globalThis.browser ?? globalThis.chrome;

(function forwardAuthResult() {
  const hash = location.hash.startsWith("#")
    ? location.hash.slice(1)
    : location.hash;

  if (!hash) return;

  const params = new URLSearchParams(hash);
  if (!params.get("token") && !params.get("error")) return;

  api.runtime
    .sendMessage({
      type: "AUTH_RESULT",
      params: Object.fromEntries(params),
    })
    .then(() => {
      // Strip the token from the address bar only once it is safely stored.
      try {
        history.replaceState(null, "", location.pathname + location.search);
      } catch {
        // Ignore: not critical if the fragment cannot be cleared this early.
      }
    })
    .catch(() => {
      // Leave the fragment intact so a retry/reload can still complete.
    });
})();
