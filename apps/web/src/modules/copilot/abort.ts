export const abortControllerMap = new Map<string, AbortController>();

export function createTask() {
  const handle = crypto.randomUUID();
  const abortController = new AbortController();
  abortControllerMap.set(handle, abortController);

  return {
    handle,
    abortController,
  };
}

export function abortTask(handle: string) {
  abortControllerMap.get(handle)?.abort();
  abortControllerMap.delete(handle);
}

export function clearTask(handle: string) {
  abortControllerMap.delete(handle);
}

export function getAbortSignal(handle: string) {
  return abortControllerMap.get(handle)?.signal;
}
