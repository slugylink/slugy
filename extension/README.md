# Slugy Browser Extension

Shorten the page you are on and copy a branded short link without leaving your
tab. Ships as a single Manifest V3 codebase for **Chrome** and **Firefox**.

## How authentication works

The extension reuses the session you already have on the Slugy dashboard — it
never handles your password or an OAuth window:

1. Click **Already signed in on the dashboard?**.
2. The background opens `GET /api/extension/connect?state=…` in a new tab.
3. If you are not signed in, the route sends you to the dashboard login and
   resumes via `?next=` afterwards.
4. Once a session exists, the route redirects to `/extension/authorize#token=…`.
5. A content script on that page reads the token, stores it, and the background
   closes the tab. Reopen the popup and you are ready.

The token is a workspace-scoped API key shown in **Dashboard → Settings → API
keys** as `Slugy Browser Extension`, so it can be revoked at any time.

This tab-based handshake works on `http://app.localhost:3000` too, where
Chrome's `launchWebAuthFlow` would refuse to run.

## Build

```bash
npm run ext:build
```

This writes `extension/dist/chrome` and `extension/dist/firefox`.

### Local development

Point the build at your local app subdomain:

```powershell
$env:SLUGY_EXT_APP_URL="http://app.localhost:3000"; npm run ext:build
```

Make sure `NEXT_APP_URL` / `BETTER_AUTH_URL` in `.env` use the same origin.

## Install (development)

**Chrome / Edge**

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `extension/dist/chrome`

**Firefox**

1. Open `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on…** → select `extension/dist/firefox/manifest.json`

After rebuilding, click the reload icon on the extension card.

## Permissions

| Permission         | Why                                                               |
| ------------------ | ----------------------------------------------------------------- |
| `storage`          | Persist the extension session token                               |
| `tabs`             | Open the connect tab, read the active tab URL, open the dashboard |
| `clipboardWrite`   | Copy the short link to the clipboard                              |
| `host_permissions` | Call the Slugy API and read the authorize page                    |
| `content_scripts`  | Read the token fragment on `/extension/authorize`                 |
