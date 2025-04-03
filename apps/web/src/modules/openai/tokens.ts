import { isWithinTokenLimit } from "gpt-tokenizer";

export function ensureTokenLimit(limit: number, input: string) {
  const safeCount = isWithinTokenLimit(input, limit);

  if (!safeCount) throw new Error("Input has exceeded length limit");

  return safeCount;
}
