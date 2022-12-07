import assert from "assert";
import type { RequestHandler } from "express";
import { constants } from "http2";
import { findOne, getAuthenticatedProxy } from "../modules/hits/search";

export const getReport: RequestHandler = async (req, res, next) => {
  try {
    const idStr = req.params.id;
    const id = parseInt(idStr);
    assert(!Number.isNaN(id));

    const authorzation = req.header("Authorization")!;
    console.log(authorzation);
    const proxy = getAuthenticatedProxy(authorzation);
    const searchResult = await findOne({ proxy, filter: { entityId: id.toString() } });

    console.log("[GET] /report", searchResult);
    res.status(constants.HTTP_STATUS_OK).json(searchResult);
  } catch (e) {
    next(e);
  }
};
