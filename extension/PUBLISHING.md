# Chrome release review — October 10, 2026

Status: local checks passed as listed below; production sign-in and store submission remain unverified. Do not treat this review as Chrome Web Store approval.

## Changes made

- Require a pending, matching authentication state that expires after 15 minutes; reject unsolicited callbacks and replays.
- Accept authentication callbacks only from the extension's top-frame content script at the configured authorize URL. Restrict session/control messages to the popup.
- Do not report successful authentication or close the callback tab if token storage fails.
- Require connection state on the backend and mark token redirects private/no-store.
- Replace `tabs` with `activeTab`; restrict content-script matching to the authorize page.
- Show authentication and session-expiration errors outside the hidden signed-in panel.
- Ignore hidden custom aliases, reset the alias toggle on sign-out, add a request timeout, and remove misleading copy-success feedback.
- Set minimum Chrome to 111 to match the existing OKLCH and color-mix CSS.
- Add extension-specific data handling to the website privacy policy. This must be deployed.

## Evidence

- 20 Node regression tests passed, including authentication, workspace selection and persistence, failed storage, refresh, and using the selected workspace's token for link creation.
- Production build completed for Chrome and Firefox. Firefox was not separately functionally tested.
- Release validator passed for production origin, exact permissions, packaged resources, PNG icon dimensions, JavaScript syntax, and package contents.
- No remote JavaScript, eval, inline script handlers, or third-party scripts are used by the extension.
- Repository ESLint could not run: its FlatCompat configuration fails with a circular JSON structure while loading the Next/React config. This is not a passing lint result.
- Repository TypeScript checking passed after regenerating stale Next route types with `node node_modules/next/dist/bin/next typegen`.
- No authenticated browser end-to-end test or Chrome Web Store dashboard review was performed. Production privacy-page availability could not be confirmed through the web reader.

## Remaining release checks

1. Deploy the backend connection changes and privacy page; confirm `https://slugy.co/privacy` is public and the deployed app base URL is `https://app.slugy.co`.
2. Load `extension/dist/chrome` unpacked in Chrome. Connect while signed in; then repeat while signed out, including the OAuth return to the extension.
3. From an HTTPS page, create and paste a link; test a custom alias, duplicate alias, invalid URL, plan limit, revoked API key, offline request, sign-out, and reconnect. Confirm that auth errors are visible and browser-restricted pages still allow manually entering a URL.
4. Verify the Save to workspace selector with owned + member workspaces, reopen the popup to check persistence, and confirm each link appears in the chosen dashboard workspace. Refresh workspaces reconnects all accessible workspaces. Custom-domain selection is not supported. Connecting still rotates live hashed extension keys, invalidating other installations for those workspaces.
5. Complete store screenshots, listing, permission explanations, privacy disclosures, and reviewer test access. Neither the listing nor a reviewer account was available in this review.

## Suggested store copy

Single purpose: Create and copy Slugy short links for the current page or a URL entered by the user, in their connected Slugy workspace.

Description: Shorten the current page or paste a URL, choose one of your owned workspaces, optionally choose a custom alias, and copy the resulting Slugy link. A Slugy account and workspace are required. Your account's link limits apply.

Permission explanations:

| Permission             | Explanation                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| activeTab              | Prefills the link field from the current tab when the user invokes the extension.                               |
| storage                | Stores the workspace API token, account details, and pending authentication state locally.                      |
| clipboardWrite         | Copies the created short URL after the user chooses Shorten & copy.                                             |
| https://app.slugy.co/* | Sends authenticated link-creation requests to Slugy and completes the account connection on its authorize page. |

Remote code: No. All extension JavaScript is packaged locally; the API returns data.

Privacy URL: `https://slugy.co/privacy` after deployment and public verification.

Data disclosure: Do not claim that the extension handles no user data. It handles account name/email/profile image URL, authentication tokens, workspace information, and submitted destination URLs/custom aliases. In the store form, review personal information, authentication information, and web history (submitted page URLs) categories against these actual data flows. It does not sweep browsing history or read page bodies. Review all certifications against the service's actual practices before submitting.

Reviewer instructions: Sign in to the provided Slugy test account on app.slugy.co, ensure it has a workspace and available link quota, open the extension, choose the connect button, finish login if prompted, reopen the popup on a regular HTTPS page, and choose Shorten & copy. Paste the result to confirm clipboard output. Provide credentials through the store's private test-instructions field, never in this repository.

## Reproduce and package

```powershell
node --test extension/extension.test.mjs extension/popup.test.mjs
node extension/build.mjs --app-url=https://app.slugy.co
node extension/verify-release.mjs
powershell -NoProfile -File extension/package.ps1
```

Upload only the generated ZIP. Its root must contain `manifest.json`, not a containing `chrome` folder. Rebuilding deletes previous files under `extension/dist`, including this ZIP. Use a higher manifest version if 1.0.0 has already been uploaded/published and the store requires an increment.

## Official references

- [Chrome publishing workflow](https://developer.chrome.com/docs/webstore/publish)
- [Privacy disclosures and minimum permissions](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [activeTab access and user gestures](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Chrome 111 CSS color support](https://developer.chrome.com/blog/new-in-chrome-111)
