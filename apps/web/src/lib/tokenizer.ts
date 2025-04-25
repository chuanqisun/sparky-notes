import { isWithinTokenLimit } from "gpt-tokenizer";
import { proxyToFigma } from "./proxy";

export function ensureTokenLimit(limit: number, input: string) {
  const safeCount = isWithinTokenLimit(input, limit);

  if (safeCount === false) {
    proxyToFigma.notify({
      showNotification: {
        message: `Input has too many tokens. Please reduce the input size`,
        config: { error: true },
      },
    });

    throw new Error("Input has exceeded length limit");
  }

  return safeCount;
}
