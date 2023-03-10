import type { RequestHandler } from "express";
import { throttle } from "../../utils/throttle";

export const rateLimit: (rpm: number, margin?: number) => RequestHandler = (rpm, margin = 0.05) => {
  const tick = () => Promise.resolve();
  const throttledTick = throttle(tick, ((1 + margin) * 60 * 1000) / rpm);

  return async (req, res, next) => {
    await throttledTick();
    next();
  };
};
