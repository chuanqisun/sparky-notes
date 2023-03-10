import assert from "assert";
import axios from "axios";
import type { RequestHandler } from "express";
import { constants } from "http2";
import { performance } from "perf_hooks";

const inMemoryTokenCache = new Map<string, number>();

export const validateHitsToken: RequestHandler = async (req, res, next) => {
  const authorizationStr = req.header("Authorization");
  if (!authorizationStr) {
    res.status(constants.HTTP_STATUS_FORBIDDEN).send("Authorization header required");
    return next("route");
  }

  try {
    performance.mark("start");

    const cachedExpiry = inMemoryTokenCache.get(authorizationStr);
    if (cachedExpiry && cachedExpiry > Date.now()) {
      next();
      return;
    }

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

    inMemoryTokenCache.set(authorizationStr, Date.now() + 1000 * 60 * 5); // good for 5 minutes

    // remove all other expired tokens
    [...inMemoryTokenCache.keys()].forEach((key) => {
      if (inMemoryTokenCache.get(key)! < Date.now()) {
        inMemoryTokenCache.delete(key);
      }
    });

    next();
  } catch (e) {
    next(e);
  }
};
