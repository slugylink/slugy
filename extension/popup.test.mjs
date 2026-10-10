import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

test("choosing a workspace sends its token when shortening and keeps the entered URL", async () => {
  const elements = new Map();
  const element = () => ({
    value: "", hidden: true, textContent: "", disabled: false, handlers: {},
    addEventListener(name, handler) { this.handlers[name] = handler; },
    setAttribute() {}, replaceChildren(...children) { this.children = children; },
    focus() {},
  });
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  const workspaces = [
    { workspace: "personal", workspaceName: "Personal", token: "slugy_personal" },
    { workspace: "business", workspaceName: "Business", token: "slugy_business" },
  ];
  let stored = { ...workspaces[0], workspaces };
  const requests = [];
  const copied = [];
  vm.runInNewContext(readFileSync(new URL("popup.js", import.meta.url), "utf8"), {
    SLUGY_CONFIG: { appUrl: "https://app.slugy.co", createLinkPath: "/api/v1/link" },
    URL, AbortSignal, console,
    document: { getElementById: get, createElement: element, addEventListener() {} },
    navigator: { clipboard: { writeText: async (value) => copied.push(value) } },
    chrome: {
      runtime: { sendMessage: async (message) => {
        if (message.type === "SELECT_WORKSPACE") stored = { ...stored, ...workspaces.find((item) => item.workspace === message.workspace) };
        return { ok: true, session: stored };
      } },
      tabs: { query: async () => [{ url: "https://example.com/current" }] },
      storage: { onChanged: { addListener() {} } },
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, status: 201, json: async () => ({ success: true, data: { shortUrl: "https://slugy.co/test" } }) };
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(get("workspace-select").children.length, 2);
  get("url-input").value = "https://example.com/edited";
  get("workspace-select").value = "business";
  const switching = get("workspace-select").handlers.change();
  assert.equal(get("shorten-button").disabled, true);
  await get("shorten-button").handlers.click();
  assert.equal(requests.length, 0);
  await switching;
  assert.equal(get("url-input").value, "https://example.com/edited");
  await get("shorten-button").handlers.click();
  assert.equal(requests[0].options.headers.Authorization, "Bearer slugy_business");
  assert.equal(JSON.parse(requests[0].options.body).url, "https://example.com/edited");
  assert.deepEqual(copied, ["https://slugy.co/test"]);
});
