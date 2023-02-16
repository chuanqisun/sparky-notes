import assert from "assert";
import axios from "axios";
import { RequestHandler } from "express";
import { constants } from "http2";
import { performance } from "perf_hooks";

export const validateHitsToken: RequestHandler = async (req, res, next) => {
  const authorizationStr = req.header("Authorization");
  if (!authorizationStr) {
    res.status(constants.HTTP_STATUS_FORBIDDEN).send("Authorization header required");
    return next("route");
  }

  try {
    performance.mark("start");
    const response = await axios({
      method: "post",
      url: `https://hits.microsoft.com/api/search/index`,
      headers: { Authorization: authorizationStr },
      data: JSON.stringify({
        top: 0,
        skip: 0,
        queryType: "Simple",
        searchText: "*",
        select: [],
      }),
    });

    assert(response.status === 200);
    assert(Array.isArray(response.data.results) && response.data.results.length === 0);
    console.log(`[token] validated ${performance.measure("Auth overhead", "start").duration.toFixed(2)} ms`);
    next();
  } catch (e) {
    next(e);
  }
};
