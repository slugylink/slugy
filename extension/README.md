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
| `activeTab`        | Read the current tab URL only when the user invokes the extension |
| `clipboardWrite`   | Copy the short link to the clipboard                              |
| `host_permissions` | Call the Slugy API and read the authorize page                    |
| `content_scripts`  | Read the token fragment on `/extension/authorize`                 |

Opening and closing tabs does not require the broad `tabs` permission.

## Release verification

Run `node --test extension/extension.test.mjs extension/popup.test.mjs` and build with
`node extension/build.mjs --app-url=https://app.slugy.co` so an environment override
cannot accidentally produce a localhost release. Upload the contents of
`extension/dist/chrome` as a ZIP with `manifest.json` at the archive root.
See [PUBLISHING.md](PUBLISHING.md) for outstanding release checks and store copy.

## Choosing a workspace

Connecting loads all non-deleted workspaces you own, each with its own
link-write API key. Choose **Save to workspace** before shortening a link;
the extension remembers the selection when reopened. The link API uses that
workspace's key, so its quotas and permissions still apply.

Use **More options → Refresh workspaces** after creating a workspace or upgrading
from a single-workspace extension session. This reconnects through the dashboard
and preserves the selected workspace if it still exists. Shared workspaces you
do not own are excluded to match the dashboard's owner-only API key creation.
Refreshing rotates extension keys as before and may disconnect other browsers.
