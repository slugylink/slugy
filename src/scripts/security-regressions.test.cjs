// Local regressions: no network, credentials, or production Redis.
// Redis EVAL is modeled as an atomic operation here; run the Lua scripts against
// a disposable Redis instance before deployment to validate provider execution.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { AsyncLocalStorage } = require('node:async_hooks');
const ts = require('typescript');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');

function load(file, modules) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, Response, URL, process: { env: { NODE_ENV: 'production' } },
    console: { error() {}, log() {} },
    require: (id) => {
      if (id in modules) return modules[id];
      if (id === 'node:crypto' || id === 'zod') return require(id);
      throw Error(`Unexpected dependency: ${id}`);
    },
  });
  return exports;
}
const apiErrors = Object.fromEntries([
  ['badRequest', 400], ['validationError', 400], ['rateLimitExceeded', 429],
  ['serviceUnavailable', 503], ['badGateway', 502],
].map(([name, status]) => [name, () => Response.json({ success: false }, { status })]));

function tempFixture() {
  const context = new AsyncLocalStorage();
  const store = new Map();
  const cookieName = '__Host-slugy-temp';
  let sequence = 0, failed = false, now = Date.now();
  const read = (key) => {
    const entry = store.get(key);
    return entry && entry.expires > now ? entry.value : null;
  };
  const write = (key, value, ttl = 900) => store.set(key, { value, expires: now + ttl * 1000 });
  const redis = {
    async get(key) { if (failed) throw Error('Redis unavailable'); return read(key); },
    async eval(script, keys, args) {
      if (failed) throw Error('Redis unavailable');
      assert.ok(script.includes("redis.call('SCARD', KEYS[4])"));
      assert.ok(script.includes("redis.call('SET', KEYS[3], ARGV[2], 'EX', ARGV[3])"));
      const [ip, owner, link, legacy] = keys;
      const [code, data, ttl] = args;
      if (read(ip) || read(owner) || read(legacy)?.length) return 0;
      if (read(link)) return -1;
      write(link, data, ttl); write(ip, code, ttl); write(owner, code, ttl);
      return 1;
    },
  };
  const route = load('src/app/api/temp/route.ts', {
    nanoid: { customAlphabet: () => () => String(++sequence).padStart(6, '0') },
    'next/headers': {
      cookies: async () => ({ get: () => context.getStore().token ? { value: context.getStore().token } : undefined }),
      headers: async () => new Headers({ 'x-real-ip': context.getStore().ip }),
    },
    '@/lib/middleware/client-ip': { getClientIp: (headers) => headers.get('x-real-ip') },
    '@/lib/redis': { redis }, '@/lib/api-response': { apiErrors },
    '@/lib/http': { jsonWithETag: (_, payload, status = 200) => {
      const response = Response.json(payload, { status, headers: { 'Cache-Control': 'private, no-store' } });
      response.cookies = { set: (name, value, options) => {
        assert.equal(name, cookieName);
        response.session = { value, options };
      } };
      return response;
    } },
  });
  return {
    store, write, read, fail: () => { failed = true; }, advance: () => { now += 901000; },
    request: (method, token, ip = '198.51.100.9', url = 'https://example.test/private?token=synthetic') =>
      context.run({ token, ip }, () => route[method](new Request('https://slugy.test/api/temp',
        method === 'POST' ? { method, body: JSON.stringify({ url }) } : undefined))),
  };
}

test('temporary-link ownership isolates browsers sharing an IP', async () => {
  const f = tempFixture();
  const initial = await f.request('GET');
  assert.deepEqual((await initial.json()).data.links, []);
  assert.match(initial.session.value, /^[a-f0-9]{64}$/);
  assert.deepEqual(JSON.parse(JSON.stringify(initial.session.options)), {
    httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 86400,
  });
  const token = initial.session.value;
  const created = await f.request('POST', token);
  assert.equal(created.status, 201);
  const mine = (await (await f.request('GET', token)).json()).data.links;
  assert.equal(mine.length, 1);
  assert.equal(mine[0].ownerId, undefined);
  assert.equal(mine[0].ip, undefined);
  for (const stranger of [undefined, 'b'.repeat(64), 'invalid-cookie']) {
    assert.deepEqual((await (await f.request('GET', stranger)).json()).data.links, []);
  }
  assert.equal((await f.request('POST', 'b'.repeat(64))).status, 429);
  assert.equal((await f.request('GET', token, '203.0.113.5')).status, 200);
});

test('concurrent creations allow one slot; expiration releases it', async () => {
  const f = tempFixture();
  const replies = await Promise.all(Array.from({ length: 12 }, (_, i) => f.request('POST', i.toString(16).padStart(64, '0'))));
  assert.equal(replies.filter((r) => r.status === 201).length, 1);
  assert.equal(replies.filter((r) => r.status === 429).length, 11);
  f.advance();
  assert.equal((await f.request('POST', 'f'.repeat(64))).status, 201);
});

test('legacy data is never discoverable; code collisions do not overwrite links', async () => {
  const f = tempFixture();
  f.write('temp:ip:198.51.100.9', ['legacy']);
  f.write('temp:link:legacy', JSON.stringify({ url: 'https://example.test/private' }));
  assert.deepEqual((await (await f.request('GET', 'a'.repeat(64))).json()).data.links, []);
  assert.equal((await f.request('POST', 'a'.repeat(64))).status, 429);
  f.write('temp:link:000002', 'do-not-overwrite');
  const result = await f.request('POST', 'b'.repeat(64), '203.0.113.8');
  assert.equal(result.status, 201);
  assert.equal(f.read('temp:link:000002'), 'do-not-overwrite');
});

test('owner mismatch, invalid URLs, and Redis failures never expose or create links', async () => {
  const f = tempFixture();
  const token = 'a'.repeat(64);
  const owner = createHash('sha256').update(token).digest('hex');
  f.write(`temp:owner:${owner}`, 'foreign');
  f.write('temp:link:foreign', { ownerId: 'different', expiresAt: new Date(Date.now() + 60000).toISOString() });
  assert.deepEqual((await (await f.request('GET', token)).json()).data.links, []);
  assert.equal((await f.request('POST', token, undefined, 'javascript:alert(1)')).status, 400);
  f.fail();
  assert.equal((await f.request('POST', token)).status, 503);
  assert.equal((await f.request('GET', token)).status, 503);
});

function quotaFixture(initial) {
  let used = initial, failed = false;
  const redis = {
    async get() { if (failed) throw Error('down'); return used; },
    async eval(script, keys, args) {
      if (failed) throw Error('down');
      assert.ok(script.includes("if used >= tonumber(ARGV[1]) then return {0, used} end"));
      assert.ok(script.includes("redis.call('EXPIRE', KEYS[1], ARGV[2])"));
      assert.equal(keys.length, 1);
      assert.equal(args[1], 86400);
      if (used >= args[0]) return [0, used];
      return [1, ++used];
    },
  };
  return { quota: load('src/lib/ai/analytics-quota.ts', { '@/lib/redis': { redis } }), fail: () => { failed = true; } };
}

test('free and paid AI quotas admit only the remaining concurrent request', async () => {
  for (const [plan, limit] of [['free', 10], ['pro', 500]]) {
    const { quota } = quotaFixture(limit - 1);
    const replies = await Promise.all(Array.from({ length: 12 }, () => quota.consumeAiQuota('workspace', plan)));
    assert.equal(replies.filter((r) => r.allowed).length, 1);
    assert.equal((await quota.getAiQuota('workspace', plan)).remaining, 0);
  }
});

test('AI route returns 503 and never calls the model when quota storage fails', async () => {
  const f = quotaFixture(0); f.fail();
  await assert.rejects(f.quota.consumeAiQuota('workspace', 'free'), f.quota.AiQuotaUnavailableError);
  await assert.rejects(f.quota.getAiQuota('workspace', 'free'), f.quota.AiQuotaUnavailableError);
  let calls = 0;
  const route = load('src/app/api/workspace/[workspaceslug]/analytics/ask/route.ts', {
    '@/lib/api-response': { apiErrors },
    '@/lib/workspace-access': { requireWorkspaceAccess: async () => ({ ok: true, workspace: { id: 'workspace' } }) },
    '@/lib/subscription/entitlements': { getWorkspaceOwnerPlanType: async () => 'free' },
    '@/lib/ai/analytics-ask-prompt': {},
    '@/lib/ai/groq': { isGroqConfigured: () => true, groqChatJson: async () => { calls++; } },
    '@/lib/ai/analytics-quota': f.quota,
  });
  const params = { params: Promise.resolve({ workspaceslug: 'workspace' }) };
  const req = new Request('https://example.test/ask', { method: 'POST', body: JSON.stringify({ question: 'Show mobile clicks' }) });
  assert.equal((await route.POST(req, params)).status, 503);
  assert.equal((await route.GET(req, params)).status, 503);
  assert.equal(calls, 0);
});
