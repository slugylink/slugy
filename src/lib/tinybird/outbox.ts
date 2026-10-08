import { redis } from "@/lib/redis";
import { ingestTinybirdEvent } from "./http";

const INDEX = "tinybird:outbox";
interface PendingEvent {
  datasource: string;
  payload: Record<string, unknown>;
}

async function deliver(key: string): Promise<void> {
  // A lease keeps cron workers from delivering the same event concurrently.
  const claimed = await redis.eval(
    `
    local score = redis.call('ZSCORE', KEYS[1], KEYS[2])
    if not score or tonumber(score) > tonumber(ARGV[1]) then return 0 end
    redis.call('ZADD', KEYS[1], ARGV[2], KEYS[2])
    return 1
  `,
    [INDEX, key],
    [Date.now(), Date.now() + 60000],
  );
  if (!claimed) return;
  const raw = await redis.get<PendingEvent | string>(key);
  if (!raw) {
    await redis.zrem(INDEX, key);
    return;
  }
  const event: PendingEvent = typeof raw === "string" ? JSON.parse(raw) : raw;
  await ingestTinybirdEvent(event.datasource, event.payload);
  await redis.eval(
    `
    redis.call('ZREM', KEYS[1], KEYS[2])
    redis.call('DEL', KEYS[2])
    return 1
  `,
    [INDEX, key],
    [],
  );
}

/** Persist before delivery. Failures remain queued without a TTL. */
export async function enqueueTinybirdEvent(
  datasource: string,
  payload: Record<string, unknown>,
) {
  const key = `tinybird:pending:${crypto.randomUUID()}`;
  await redis.eval(
    `
    local kind = redis.call('TYPE', KEYS[1]).ok
    if kind ~= 'none' and kind ~= 'zset' then return redis.error_reply('Invalid outbox type') end
    redis.call('SET', KEYS[2], ARGV[1])
    redis.call('ZADD', KEYS[1], ARGV[2], KEYS[2])
    return 1
  `,
    [INDEX, key],
    [JSON.stringify({ datasource, payload }), Date.now()],
  );
  await deliver(key);
}

export async function retryTinybirdEvents(limit = 100) {
  const keys = await redis.zrange<string[]>(INDEX, 0, Date.now(), {
    byScore: true,
    offset: 0,
    count: limit,
  });
  let failed = 0;
  for (let i = 0; i < keys.length; i += 20) {
    const results = await Promise.allSettled(
      keys.slice(i, i + 20).map(deliver),
    );
    failed += results.filter((result) => result.status === "rejected").length;
  }
  if (failed) throw new Error(`${failed} Tinybird deliveries remain queued`);
  return keys.length;
}
