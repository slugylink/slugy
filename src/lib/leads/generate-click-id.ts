import { customAlphabet } from "nanoid";

const generateClickId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  24,
);

export function createClickId(): string {
  return generateClickId();
}
