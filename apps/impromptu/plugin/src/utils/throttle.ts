export function throttle<T extends any[], K extends any>(func: (...args: T) => Promise<K>, interval: number) {
  // Previously called time of the function
  let prev = 0;
  return (...args: T) => {
    const now = Date.now();

    // TODO optimize, don't waste event loop
    return new Promise<K>((resolve) => {
      setTimeout(() => {
        prev = Date.now();
        resolve(func(...args));
      }, Math.max(0, prev + interval - now));
    });
  };
}
