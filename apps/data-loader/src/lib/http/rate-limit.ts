import { throttle } from "./throttle";

export function withAsyncQueue<T extends any[], K extends any>(asyncQueue: AsyncQueue, func: (...args: T) => Promise<K>) {
  return async (...args: T) =>
    new Promise<any>((resolve, reject) =>
      asyncQueue.enqueue(async () =>
        func(...args)
          .then(resolve)
          .catch(reject)
      )
    );
}

export interface AsyncQueue {
  enqueue(task: () => any): void;
}

export function rateLimitQueue(rpm: number, margin = 0.1): AsyncQueue {
  let queue: any[] = [];
  let started = false;

  async function tick() {
    const task = queue.shift();
    if (task) {
      await task();
    } else {
      started = false;
    }
  }

  const throttledTick = throttle(tick, ((1 + margin) * 60 * 1000) / rpm);

  function enqueue(task: () => any) {
    queue.push(task);
    if (!started) {
      start();
    }
  }

  async function start() {
    started = true;

    while (started) {
      await throttledTick();
    }
  }

  return {
    enqueue,
  };
}
