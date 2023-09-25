import axios from "axios";
import type { RequestHandler } from "express";

export const hitsSearchIndex: RequestHandler = async (req, res, next) => {
  try {
    const result = await axios({
      url: "https://hits.microsoft.com/api/search/index",
      method: "post",
      data: req.body,
      headers: {
        "Content-Type": req.headers["content-type"],
        Authorization: req.headers["authorization"],
      },
    });

    res.status(result.status).json(result.data);
    next();
  } catch (e) {
    next(e);
  }
};
