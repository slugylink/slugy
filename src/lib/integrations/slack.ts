import { createHmac, timingSafeEqual } from "crypto";

export async function postSlackMessage(input: {
  botToken: string;
  channel: string;
  text: string;
}): Promise<void> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.botToken}`,
    },
    body: JSON.stringify({ channel: input.channel, text: input.text }),
  });
  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
  } | null;
  if (!res.ok || !data?.ok) {
    throw new Error(`slack_post_failed: ${data?.error ?? res.status}`);
  }
}

/** Verify Slack slash-command / event signatures (Signing Secret). */
export function verifySlackSignature(input: {
  signingSecret: string;
  timestamp: string;
  body: string;
  signature: string;
}): boolean {
  const { signingSecret, timestamp, body, signature } = input;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const expected = `v0=${createHmac("sha256", signingSecret).update(`v0:${timestamp}:${body}`, "utf8").digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
