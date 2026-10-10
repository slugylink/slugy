import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "dist", "chrome");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions.toSorted(), ["activeTab", "clipboardWrite", "storage"]);
assert.deepEqual(manifest.host_permissions, ["https://app.slugy.co/*"]);
assert.deepEqual(manifest.content_scripts[0].matches, ["https://app.slugy.co/extension/authorize"]);
assert.ok(manifest.description.length <= 132);
assert.match(manifest.version, /^\d+(\.\d+){0,3}$/);
const context = {};
vm.runInNewContext(readFileSync(join(root, "config.js"), "utf8"), context);
assert.equal(context.SLUGY_CONFIG.appUrl, "https://app.slugy.co");
for (const [size, path] of Object.entries(manifest.icons)) {
  const png = readFileSync(join(root, path));
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png.readUInt32BE(16), Number(size));
  assert.equal(png.readUInt32BE(20), Number(size));
}
for (const file of [manifest.action.default_popup, manifest.background.service_worker, ...manifest.content_scripts[0].js]) {
  assert.ok(existsSync(join(root, file)), `Missing ${file}`);
}
const html = readFileSync(join(root, manifest.action.default_popup), "utf8");
for (const [, path] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  assert.ok(!path.includes(":"), `External popup resource: ${path}`);
  assert.ok(existsSync(join(root, path)), `Missing popup resource: ${path}`);
}
for (const file of readdirSync(root).filter((name) => name.endsWith(".js"))) {
  new vm.Script(readFileSync(join(root, file), "utf8"), { filename: file });
}
assert.deepEqual(readdirSync(root).toSorted(), [
  "background.js", "config.js", "content.js", "icons", "manifest.json", "popup.css", "popup.html", "popup.js",
]);
console.log("Chrome release verified: production origin, permissions, resources, icon dimensions, JavaScript syntax, package contents.");
