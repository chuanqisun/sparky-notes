import { parse } from "@postlight/parser";
import assert from "assert";
import type { RequestHandler } from "express";

export const webCrawl: RequestHandler = async (req, res, next) => {
  try {
    const { url } = req.body;
    assert(typeof url === "string");

    const parsedPage = await parse(url, { contentType: "markdown" });

    res.status(200).json({
      text: parsedPage.content ?? "",
    });

    next();
  } catch (e) {
    console.log(`[web-crawl] error ${req.body.url} ${(e as any).name} ${(e as any).message}`);
    res.status(200).json({
      text: "",
    });
  }
};
