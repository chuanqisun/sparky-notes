import assert from "assert";
import type { RequestHandler } from "express";
import { constants } from "http2";
import { findOne, getAuthenticatedProxy } from "../modules/hits/search";
import { searchOutputToObject } from "../modules/parse/search-result-to-object";

export const getReport: RequestHandler = async (req, res, next) => {
  try {
    const idStr = req.params.id;
    const id = parseInt(idStr);
    assert(!Number.isNaN(id));

    const authorzation = req.header("Authorization")!;
    const proxy = getAuthenticatedProxy(authorzation);
    const searchResult = await findOne({ proxy, filter: { entityId: id.toString() } });

    if (searchResult === null) {
      res.status(constants.HTTP_STATUS_NOT_FOUND).json(null);
    } else {
      const parsedResult = searchOutputToObject(searchResult);
      res.status(constants.HTTP_STATUS_OK).json(parsedResult);
    }

    next();
  } catch (e) {
    if (e?.response?.status) {
      res.status(e.response.status).json("Error getting results from search index");
      next();
    } else {
      next(e);
    }
  }
};
