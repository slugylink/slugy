import { customAlphabet } from "nanoid";

const generateClickId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  24,
);

export function createClickId(): string {
  return generateClickId();
}

const generateApiKeySecret = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  32,
);

export function createWorkspaceApiKey(): string {
  return `slugy_sk_${generateApiKeySecret()}`;
}
