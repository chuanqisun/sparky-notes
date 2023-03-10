import type { RequestHandler } from "express";
import { throttle } from "../../utils/throttle";

export const rateLimit: (rpm: number, margin?: number) => RequestHandler = (rpm, margin = 0.05) => {
  const queue = rateLimitQueue(rpm, margin);

  return async (req, res, next) => {
    queue.enqueue(next);
  };
};

export function rateLimitQueue(rpm: number, margin: number) {
  let queue: any[] = [];
  let started = false;

  async function tick() {
    const task = queue.shift();
    if (task) {
      await task();
    }
  }

  function enqueue(task: () => any) {
    queue.push(task);
    if (!started) {
      start();
    }
  }

  async function start() {
    started = true;
    const throttledTick = throttle(tick, ((1 + margin) * 60 * 1000) / rpm);

    while (true) {
      await throttledTick();
    }
  }

  return {
    enqueue,
  };
}
