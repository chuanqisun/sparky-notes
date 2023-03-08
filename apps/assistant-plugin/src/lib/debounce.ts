export function debounce<T extends any[], K>(fn: (...args: T) => K, delayInMs: number) {
  let timeoutId: number | undefined;

  return (...args: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = undefined;
    }, delayInMs);
  };
}
