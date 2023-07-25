export function withTimeout(abortReason: string, timeout: number, controller: AbortController): () => void {
  const timeoutId = setTimeout(() => {
    controller.abort(abortReason);
  }, timeout);

  const unwatch = () => {
    clearTimeout(timeoutId);
  };

  return unwatch;
}

export const TIMEOUT_ABORT_REASON = "Request timed out";
