import { RequestHandler } from "express";
import { constants } from "http2";
import { parseJwt } from "../utils/jwt";

export const requireToken: RequestHandler = async (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(constants.HTTP_STATUS_FORBIDDEN).send("Authorization header required");
  const parsedToken = parseJwt(token);
  if (parsedToken === null) return res.status(constants.HTTP_STATUS_FORBIDDEN).send("Authroization header format is invalid");
  if (typeof parsedToken["exp"] !== "number") return res.status(constants.HTTP_STATUS_FORBIDDEN).send("Authroization header format is invalid");

  next();
};
