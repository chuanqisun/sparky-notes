import type { ErrorRequestHandler } from "express";

export const logError: ErrorRequestHandler = (err, req, res, next) => {
  console.log(`[ERR] ${req.method} ${req.path}`);
  next(err);
};
