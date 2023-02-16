import { RequestHandler } from "express";
import { constants } from "http2";
import { parseJwtBody } from "../../utils/jwt";

export const requireJwt: RequestHandler = async (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    res.status(constants.HTTP_STATUS_FORBIDDEN).send("Authorization header required");
    return next("route");
  }

  const parsedToken = parseJwtBody(token);
  if (parsedToken === null || typeof parsedToken["exp"] !== "number") {
    res.status(constants.HTTP_STATUS_FORBIDDEN).send("Authroization header format is invalid");
    return next("route");
  }

  next();
};
