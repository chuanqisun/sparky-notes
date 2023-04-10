import type { RequestHandler } from "express";

export const logRoute: RequestHandler = (req, res, next) => {
  console.log(`[${res.statusCode}] ${req.method} ${req.path}`);
  next();
};
