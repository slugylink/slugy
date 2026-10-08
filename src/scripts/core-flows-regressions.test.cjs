// Local regression tests: all external services are replaced with in-memory fakes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
function load(file, modules = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, Response, Request, Headers, URL, Error, Date,
    AbortController, setTimeout, clearTimeout, crypto: webcrypto,
    process: { env: { NODE_ENV: 'test', TINYBIRD_TOKEN: 'test' } },
    console: { log() {}, error() {}, warn() {} },
    require(id) {
      if (id in modules) return modules[id];
      if (id === 'server-only') return {};
      if (id === 'zod' || id === 'node:crypto') return require(id);
      throw Error(`Unexpected import: ${id}`);
    }, ...globals });
  return exports;
}
const next = { NextResponse: { json: Response.json, redirect: (url, status = 307) => new Response(null, { status, headers: { location: String(url) } }) }, NextRequest: Request };

test('checkout replaces all caller-controlled customer identity and metadata', async () => {
  let checkout;
  const route = load('src/app/api/subscription/checkout/route.ts', {
    '@/lib/polar-config': { getPolarServer: () => 'sandbox' },
    '@/lib/auth': { auth: { api: { getSession: async () => ({ user: { id: 'me' } }) } } },
    'next/headers': { headers: async () => new Headers() }, 'next/server': next,
    '@/server/db': { db: { user: { findUnique: async () => ({ id: 'me', email: 'me@example.test', name: 'Me', customerId: 'my-customer' }) } } },
    '@/constants/data/price': { PRICING_COPY: {} },
    '@/lib/subscription/promo': { shouldApplyCheckoutPromo: () => false },
    '@polar-sh/nextjs': { Checkout: () => async req => { checkout = new URL(req.url); return new Response(); } },
  });
  await route.GET(new Request('https://app.test/api/subscription/checkout?products=pro&customerId=other&customerExternalId=other&customerEmail=other@test&customerName=other&customerMetadata=evil&metadata=%7B%22userId%22%3A%22other%22%7D'));
  assert.equal(checkout.searchParams.get('customerId'), 'my-customer');
  assert.equal(checkout.searchParams.get('customerExternalId'), 'me');
  assert.equal(checkout.searchParams.get('customerEmail'), 'me@example.test');
  assert.equal(checkout.searchParams.get('customerName'), 'Me');
  assert.equal(checkout.searchParams.get('customerMetadata'), null);
  assert.deepEqual(JSON.parse(checkout.searchParams.get('metadata')), { userId: 'me' });
});

test('self-only actions reject unauthenticated and cross-user calls', async () => {
  let current = null;
  const { requireSelf } = load('src/lib/require-self.ts', {
    '@/lib/auth': { getAuthSession: async () => current ? { success: true, session: { user: { id: current } } } : { success: false } },
  });
  await assert.rejects(requireSelf('other'), /Unauthorized/);
  current = 'me';
  await assert.rejects(requireSelf('other'), /Unauthorized/);
  await requireSelf('me');
});

test('Tinybird rejects HTTP failures, quarantine responses and absent credentials', async () => {
  for (const response of [() => new Response('', { status: 503 }), () => Response.json({ successful_rows: 0, quarantined_rows: 1 })]) {
    const { ingestTinybirdEvent } = load('src/lib/tinybird/http.ts', {}, { fetch: async () => response() });
    await assert.rejects(ingestTinybirdEvent('events', {}), /Tinybird/);
  }
  const { ingestTinybirdEvent } = load('src/lib/tinybird/http.ts', {}, { process: { env: {} } });
  await assert.rejects(ingestTinybirdEvent('events', {}), /credentials/);
});

test('Tinybird outbox keeps failed deliveries and acknowledges a successful retry', async () => {
  const data = new Map(), index = new Map();
  let fail = true, sends = 0;
  const redis = {
    async eval(script, keys, args) {
      if (script.includes("'SET'")) { data.set(keys[1], args[0]); index.set(keys[1], args[1]); return 1; }
      if (script.includes("'ZSCORE'")) {
        const score = index.get(keys[1]);
        if (score === undefined || score > args[0]) return 0;
        index.set(keys[1], args[1]); return 1;
      }
      index.delete(keys[1]); data.delete(keys[1]); return 1;
    },
    async get(key) { return data.get(key); },
    async zrem(_, key) { index.delete(key); },
    async zrange() { return [...index.keys()]; },
  };
  const outbox = load('src/lib/tinybird/outbox.ts', { '@/lib/redis': { redis }, './http': { ingestTinybirdEvent: async () => { sends++; if (fail) throw Error('unavailable'); } } });
  await assert.rejects(outbox.enqueueTinybirdEvent('clicks', { click_id: 'stable-id' }));
  assert.equal(data.size, 1);
  assert.equal(JSON.parse([...data.values()][0]).payload.click_id, 'stable-id');
  for (const key of index.keys()) index.set(key, 0);
  fail = false;
  await Promise.all([outbox.retryTinybirdEvents(), outbox.retryTinybirdEvents()]);
  assert.equal(sends, 2);
  assert.equal(data.size, 0);
});

test('analytics backfill acknowledges duplicates/deleted links and retains failed batches', async () => {
  const event = { linkId: 'link', timestamp: '2026-10-08T00:00:00Z', clickId: 'click' };
  const queued = [{ key: 'a', event }, { key: 'b', event }, { key: 'deleted', event: { ...event, linkId: 'gone', clickId: 'gone' } }];
  const stored = new Set(['click']);
  let cleared = [], fail = false;
  const route = load('src/app/api/analytics/batch/route.ts', {
    'next/server': next, '@/lib/cron-auth': { withCronAuth: f => f },
    '@/lib/tinybird/outbox': { retryTinybirdEvents: async () => 0 },
    '@/lib/analytics/geo': { normalizeContinentKey: x => x },
    '@/server/db': { db: { $transaction: async f => f({ link: { findMany: async () => [{ id: 'link' }] }, analytics: { createMany: async ({ data, skipDuplicates }) => {
      assert.equal(skipDuplicates, true); if (fail) throw Error('offline');
      let count = 0; for (const row of data) if (!stored.has(row.clickId)) { stored.add(row.clickId); count++; } return { count };
    } } }) } },
    '@/lib/cache-utils/analytics-cache': {
      peekAnalyticsEventKeys: async () => queued.map(x => x.key), readAnalyticsEventsByKeys: async () => queued,
      clearProcessedAnalyticsEvents: async keys => { cleared.push(...keys); }, getCachedAnalyticsCount: async () => 0,
    },
  });
  assert.equal((await route.POST(new Request('https://app.test', { method: 'POST' }))).status, 200);
  assert.deepEqual(cleared.sort(), ['a', 'b', 'deleted']);
  cleared = []; fail = true;
  assert.equal((await route.POST(new Request('https://app.test', { method: 'POST' }))).status, 503);
  assert.equal(cleared.length, 0);
});

test('concurrent UTM creates share the workspace lock and cannot exceed quota', async () => {
  let count = 4, tail = Promise.resolve();
  const route = load('src/app/api/workspace/[workspaceslug]/utm-templates/route.ts', {
    '@/lib/http': { jsonWithETag: (_, body, opts) => Response.json(body, opts) },
    '@/lib/auth': { auth: { api: { getSession: async () => ({ user: { id: 'me' } }) } } },
    'next/headers': { headers: async () => new Headers() },
    '@/server/db': { db: {
      workspace: { findFirst: async () => ({ id: 'ws', maxUtmTemplates: 5 }) },
      async $transaction(fn) {
        let unlock;
        const prior = tail; tail = new Promise(resolve => { unlock = resolve; });
        let locked = false;
        try { return await fn({
          $queryRaw: async () => { await prior; locked = true; return [{ maxUtmTemplates: 5 }]; },
          utmTemplate: {
            count: async () => { assert.ok(locked); return count; }, findFirst: async () => null,
            create: async ({ data }) => { count++; return data; },
          },
        }); } finally { unlock(); }
      },
    } },
  });
  const responses = await Promise.all(['one','two','three'].map(name => route.POST(new Request('https://app.test', { method: 'POST', body: JSON.stringify({ name }) }), { params: Promise.resolve({ workspaceslug: 'ws' }) })));
  assert.deepEqual(responses.map(r => r.status).sort(), [201,400,400]);
  assert.equal(count, 5);
});

test('workspace actions reject invalid slugs and prevent concurrent limit bypass', async () => {
  let count = 0, tail = Promise.resolve(), reads = 0;
  const guard = load('src/lib/require-self.ts', { '@/lib/auth': { getAuthSession: async () => ({ success: true, session: { user: { id: 'me' } } }) } });
  const route = load('src/server/actions/workspace/workspace.ts', {
    '@/lib/workspace-cookie': load('src/lib/workspace-cookie.ts'),
    '@/lib/auth': { getAuthSession: async () => ({ success: true, session: { user: { id: 'me' } } }) },
    '@/lib/require-self': guard,
    '@/server/actions/limit': { checkWorkspaceLimit: async () => ({ canCreate: true, maxLimit: 1 }) },
    '@vercel/functions': { waitUntil() {} },
    '@/lib/usage-period': { calculateUsagePeriod: () => ({ periodStart: new Date(), periodEnd: new Date() }) },
    'next/cache': { revalidateTag() {}, revalidatePath() {} },
    '@prisma/client': { Prisma: { PrismaClientKnownRequestError: class extends Error {} } },
    '@/lib/cache-utils/workspace-cache': {
      invalidateWorkspaceCache: async () => {},
      getAllWorkspacesCache: async () => { reads++; return ['secret']; },
      getDefaultWorkspaceCache: async () => { reads++; return {}; },
      getWorkspaceValidationCache: async () => { reads++; return {}; },
    },
    '@/server/actions/email': {}, '@/lib/subscription/free-entitlement': { ensureFreeSubscription: async () => {} },
    '@/server/db': { db: {
      workspace: { findFirst: async () => { reads++; return {}; } },
      async $transaction(fn) {
        let unlock; const prior = tail; tail = new Promise(resolve => { unlock = resolve; });
        try { return await fn({
          $queryRaw: async () => { await prior; return []; },
          workspace: { count: async () => count, create: async ({ data }) => { count++; return { id: 'ws', ...data }; } },
          member: { create: async () => {} }, usage: { create: async () => {} },
        }); } finally { unlock(); }
      },
    } },
  });
  assert.equal((await route.createWorkspace({ name: 'Workspace', slug: 'bad/slug' })).success, false);
  assert.equal(count, 0);
  assert.equal((await route.createWorkspace({ name: 'Workspace', slug: 'login' })).success, false);
  const results = await Promise.all(['one','two'].map(slug => route.createWorkspace({ name: 'Workspace', slug })));
  assert.equal(results.filter(x => x.success).length, 1);
  assert.equal(count, 1);
  for (const name of ['fetchAllWorkspaces','getDefaultWorkspace','getRedirectWorkspace','validateWorkspaceSlug']) {
    assert.equal((await route[name]('other', 'ws')).success, false);
  }
  assert.equal(reads, 0);
});

test('click counters execute inside one transaction and respect rejected quota updates', async () => {
  let limited = false, transactions = 0;
  const sql = (parts, ...values) => ({ text: parts.join('?'), values, then: (resolve) => resolve(parts.join('').includes('SELECT "maxClicksLimit"') ? [{ maxClicksLimit: 5, userId: 'me' }] : []) });
  sql.transaction = async (statements, options) => {
    transactions++;
    assert.match(statements[0].text, /FOR UPDATE/);
    assert.match(statements[1].text, /"clicksTracked" < t\."maxClicksLimit"/);
    assert.match(statements[1].text, /EXISTS \(SELECT 1 FROM tracked\)/);
    assert.equal(options.isolationLevel, 'ReadCommitted');
    return [[], limited ? [] : [{ clicksTracked: 5 }]];
  };
  const { recordLinkClick } = load('src/lib/analytics/record-click.ts', {
    '@/server/neon': { primarySql: sql }, '@/lib/redis': { redis: { incr: async () => 1 } },
    '@/lib/usage-period': { calculateUsagePeriod: () => ({ periodStart: new Date(), periodEnd: new Date() }) },
    '@/lib/cache-utils/workspace-cache': { getWorkspaceLimitsCache: async () => null, setWorkspaceLimitsCache: async () => {} },
  });
  const input = { linkId: 'link', workspaceId: 'ws', slug: 'slug', domain: 'test' };
  assert.equal((await recordLinkClick(input)).ok, true);
  limited = true;
  assert.equal((await recordLinkClick(input)).limited, true);
  assert.equal(transactions, 2);
});
