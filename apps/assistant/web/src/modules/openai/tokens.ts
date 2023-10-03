import { isWithinTokenLimit } from "gpt-tokenizer";

export function ensureTokenLimit(limit: number, input: string) {
  if (!isWithinTokenLimit(input, limit)) throw new Error("Input has exceeded length limit");
}
