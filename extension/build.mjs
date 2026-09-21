import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");

// Override for local development via `npm run ext:dev`, or manually:
//   npm run ext:build -- --app-url=http://app.localhost:3000
//   PowerShell: $env:SLUGY_EXT_APP_URL="http://app.localhost:3000"; npm run ext:build
const appUrlArg = process.argv
  .find((arg) => arg.startsWith("--app-url="))
  ?.slice("--app-url=".length);

const APP_URL =
  appUrlArg || process.env.SLUGY_EXT_APP_URL || "https://app.slugy.co";

const SHARED = [
  "background.js",
  "content.js",
  "popup.html",
  "popup.js",
  "popup.css",
];

const configSource = `globalThis.SLUGY_CONFIG = ${JSON.stringify(
  {
    appUrl: APP_URL,
    connectPath: "/api/extension/connect",
    createLinkPath: "/api/v1/link",
    dashboardPath: "/",
  },
  null,
  2,
)};\n`;

const TARGETS = [
  { name: "chrome", manifest: "manifest.chrome.json" },
  { name: "firefox", manifest: "manifest.firefox.json" },
];

const isLocal = /localhost|127\.0\.0\.1/.test(APP_URL);
const isLocalPattern = (pattern) => /localhost|127\.0\.0\.1/.test(pattern);

// Production builds must not advertise local dev origins.
function prepareManifest(source) {
  const manifest = JSON.parse(readFileSync(source, "utf8"));
  if (isLocal) return manifest;

  if (Array.isArray(manifest.host_permissions)) {
    manifest.host_permissions =
      manifest.host_permissions.filter((p) => !isLocalPattern(p));
  }

  if (Array.isArray(manifest.content_scripts)) {
    for (const script of manifest.content_scripts) {
      if (Array.isArray(script.matches)) {
        script.matches = script.matches.filter((m) => !isLocalPattern(m));
      }
    }
  }

  return manifest;
}

rmSync(dist, { recursive: true, force: true });

for (const target of TARGETS) {
  const outDir = join(dist, target.name);
  mkdirSync(outDir, { recursive: true });

  for (const file of SHARED) {
    const source = join(root, file);
    if (!existsSync(source)) {
      throw new Error(`Missing extension file: ${file}`);
    }
    copyFileSync(source, join(outDir, file));
  }

  writeFileSync(join(outDir, "config.js"), configSource);
  cpSync(join(root, "icons"), join(outDir, "icons"), { recursive: true });

  const manifest = prepareManifest(join(root, target.manifest));
  writeFileSync(
    join(outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  console.log(
    `Built ${target.name} (${APP_URL}) -> ${join("extension", "dist", target.name)}`,
  );
}
