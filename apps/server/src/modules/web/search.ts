import assert from "assert";
import axios from "axios";
import * as cheerio from "cheerio";
import type { RequestHandler } from "express";

export const webSearch: RequestHandler = async (req, res, next) => {
  try {
    const { q } = req.body;
    assert(typeof q === "string");

    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;

    // crawl duckduckgo html results
    const response = await axios.request({ url });

    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $(".results .result").each((i, el) => {
      results.push({
        title: $(".result__title", el).text().trim(),
        snippet: $(".result__snippet", el).text().trim(),
        url: new URL(("https:" + $(".result__title a", el).attr("href")) as string).searchParams.get("uddg"),
      });
    });

    res.status(response.status).json({
      pages: results,
    });

    next();
  } catch (e) {
    next(e);
  }
};
