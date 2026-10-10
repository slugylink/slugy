import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import test from "node:test";

const source = readFileSync(new URL("background.js", import.meta.url), "utf8");
const popup = { id: "test", url: "chrome-extension://test/popup.html" };
const callback = {
  id: "test",
  url: "https://app.slugy.co/extension/authorize",
  frameId: 0,
  tab: { id: 7 },
};

function worker() {
  const data = {};
  const closed = [];
  const opened = [];
  let listener;
  let failWrite = false;
  const chrome = {
    runtime: {
      id: "test",
      getURL: (path) => `chrome-extension://test/${path}`,
      onMessage: { addListener: (fn) => { listener = fn; } },
    },
    storage: { local: {
      get: async () => data,
      set: async (values) => {
        if (failWrite) throw new Error("Storage unavailable");
        Object.assign(data, values);
      },
      remove: async (keys) => { for (const key of keys) delete data[key]; },
    } },
    tabs: {
      create: async (options) => { opened.push(options); return { id: 7 }; },
      remove: async (id) => { closed.push(id); },
    },
  };
  vm.runInNewContext(source, {
    chrome, crypto: webcrypto, URL, console: { error() {} },
    SLUGY_CONFIG: { appUrl: "https://app.slugy.co", connectPath: "/api/extension/connect" },
  });
  const send = (message, sender = popup) => new Promise((resolve) => {
    assert.equal(listener(message, sender, resolve), true);
  });
  return { data, closed, opened, send, failWrites: () => { failWrite = true; } };
}

async function connect(w) {
  assert.equal((await w.send({ type: "START_CONNECT" })).ok, true);
  const state = new URL(w.opened[0].url).searchParams.get("state");
  assert.ok(state);
  return state;
}

test("valid connection persists token and closes callback; replay is rejected", async () => {
  const w = worker();
  const state = await connect(w);
  const message = { type: "AUTH_RESULT", params: { state, token: "slugy_test" } };
  const result = await w.send(message, callback);
  assert.equal(result.ok, true);
  assert.equal(result.session, undefined);
  assert.equal(w.data.slugySession.token, "slugy_test");
  assert.deepEqual(w.closed, [7]);
  assert.equal((await w.send(message, callback)).ok, false);
  assert.deepEqual(w.closed, [7]);
});

for (const scenario of ["unsolicited", "missing", "mismatch", "expired"]) {
  test(`rejects ${scenario} callback state`, async () => {
    const w = worker();
    let state;
    if (scenario !== "unsolicited") state = await connect(w);
    if (scenario === "missing") state = undefined;
    if (scenario === "mismatch") state = "wrong";
    if (scenario === "expired") w.data.slugyPendingState.createdAt -= 16 * 60 * 1000;
    assert.equal((await w.send({ type: "AUTH_RESULT", params: { state, token: "slugy_test" } }, callback)).ok, false);
    assert.equal(w.data.slugySession, undefined);
    assert.deepEqual(w.closed, []);
  });
}

for (const sender of [
  { ...callback, id: "other" },
  { ...callback, url: "https://evil.example/extension/authorize" },
  { ...callback, url: "https://app.slugy.co/extension/other" },
  { ...callback, frameId: 1 },
  popup,
]) {
  test(`rejects untrusted sender ${JSON.stringify(sender)}`, async () => {
    const w = worker();
    const state = await connect(w);
    assert.equal((await w.send({ type: "AUTH_RESULT", params: { state, token: "slugy_test" } }, sender)).ok, false);
    assert.equal(w.data.slugySession, undefined);
    assert.deepEqual(w.closed, []);
  });
}

test("content scripts cannot request the session from the background", async () => {
  const w = worker();
  w.data.slugySession = { token: "slugy_test" };
  assert.equal((await w.send({ type: "GET_SESSION" }, callback)).ok, false);
  assert.equal((await w.send({ type: "GET_SESSION" })).session.token, "slugy_test");
});

test("storage failure does not claim success or close callback", async () => {
  const w = worker();
  const state = await connect(w);
  w.failWrites();
  assert.equal((await w.send({ type: "AUTH_RESULT", params: { state, token: "slugy_test" } }, callback)).ok, false);
  assert.ok(w.data.slugyPendingState);
  assert.deepEqual(w.closed, []);
});

test("sign out removes session and pending state", async () => {
  const w = worker();
  await connect(w);
  w.data.slugySession = { token: "slugy_test" };
  assert.equal((await w.send({ type: "SIGN_OUT" })).ok, true);
  assert.deepEqual(w.data, {});
});

const connections = [
  { workspace: "personal", workspaceName: "Personal", token: "slugy_personal" },
  { workspace: "business", workspaceName: "Business", token: "slugy_business" },
];

async function connectWorkspaces(w, workspaces = connections) {
  const state = await connect(w);
  return w.send({ type: "AUTH_RESULT", params: {
    state, token: connections[0].token, workspaces: JSON.stringify(workspaces),
  } }, callback);
}

test("workspace switching persists the matching scoped token across popup sessions", async () => {
  const w = worker();
  assert.equal((await connectWorkspaces(w)).ok, true);
  assert.equal(w.data.slugySession.workspace, "personal");
  const response = await w.send({ type: "SELECT_WORKSPACE", workspace: "business" });
  assert.equal(response.ok, true);
  const reopened = await w.send({ type: "GET_SESSION" });
  assert.equal(reopened.session.workspace, "business");
  assert.equal(reopened.session.workspaceName, "Business");
  assert.equal(reopened.session.token, "slugy_business");
});

test("unknown workspace and content-script switching cannot change the selected token", async () => {
  const w = worker();
  await connectWorkspaces(w);
  assert.equal((await w.send({ type: "SELECT_WORKSPACE", workspace: "someone-else" })).ok, false);
  assert.equal((await w.send({ type: "SELECT_WORKSPACE", workspace: "business" }, callback)).ok, false);
  assert.equal(w.data.slugySession.token, "slugy_personal");
});

test("refresh preserves selection and replaces its token", async () => {
  const w = worker();
  await connectWorkspaces(w);
  await w.send({ type: "SELECT_WORKSPACE", workspace: "business" });
  const state = (await w.send({ type: "START_CONNECT" }), w.data.slugyPendingState.state);
  await w.send({ type: "AUTH_RESULT", params: {
    state, token: "slugy_new_personal",
    workspaces: JSON.stringify(connections.map((item) => ({ ...item, token: `slugy_new_${item.workspace}` }))),
  } }, callback);
  assert.equal(w.data.slugySession.workspace, "business");
  assert.equal(w.data.slugySession.token, "slugy_new_business");
});

test("refresh falls back to the default when selected workspace was removed", async () => {
  const w = worker();
  await connectWorkspaces(w);
  await w.send({ type: "SELECT_WORKSPACE", workspace: "business" });
  await w.send({ type: "START_CONNECT" });
  await w.send({ type: "AUTH_RESULT", params: {
    state: w.data.slugyPendingState.state, token: "slugy_personal",
    workspaces: JSON.stringify([connections[0]]),
  } }, callback);
  assert.equal(w.data.slugySession.workspace, "personal");
});

test("malformed or duplicate workspace credentials cannot replace a session", async () => {
  for (const workspaces of [[], [{ workspace: "bad", token: "bad" }], [connections[0], connections[0]]]) {
    const w = worker();
    assert.equal((await connectWorkspaces(w, workspaces)).ok, false);
    assert.equal(w.data.slugySession, undefined);
    assert.deepEqual(w.closed, []);
  }
});

test("failed workspace persistence keeps the previous session", async () => {
  const w = worker();
  await connectWorkspaces(w);
  w.failWrites();
  assert.equal((await w.send({ type: "SELECT_WORKSPACE", workspace: "business" })).ok, false);
  assert.equal(w.data.slugySession.token, "slugy_personal");
});
