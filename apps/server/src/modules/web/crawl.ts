import assert from "assert";
import axios from "axios";
import * as cheerio from "cheerio";
import type { RequestHandler } from "express";

export const webCrawl: RequestHandler = async (req, res, next) => {
  try {
    const { url } = req.body;
    assert(typeof url === "string");

    const response = await axios.request({ url });

    if (!response.headers["content-type"]?.toString().toLocaleLowerCase().includes("text/html")) {
      throw new Error(`Invalid content type for crawler ${response.headers["content-type"]}`);
    }

    const $ = cheerio.load(response.data);

    $("script,noscript,svg,iframe,style,img,form,nav,footer").remove();

    let mainText = $("main").text();
    if (!mainText) mainText = $("body").text();

    const cleanedText = mainText
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n");

    res.status(response.status).json({
      text: cleanedText,
    });

    next();
  } catch (e) {
    console.log(`[web-crawl] error ${req.body.url} ${(e as any).name} ${(e as any).message}`);
    res.status(200).json({
      text: "",
    });
  }
};
