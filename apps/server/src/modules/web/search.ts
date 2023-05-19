import assert from "assert";
import axios from "axios";
import axiosRetry from "axios-retry";
import * as cheerio from "cheerio";
import type { RequestHandler } from "express";

const axiosInstance = axios.create();
axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: (count) => {
    console.log(`search retry: ${count}`);
    return count * 2000 + 5000;
  },
  retryCondition: () => true,
});

export const webSearch: RequestHandler = async (req, res, next) => {
  try {
    const { q } = req.body;
    assert(typeof q === "string");

    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;

    // crawl duckduckgo html results
    const response = await axiosInstance.request({ url, timeout: 30000 });

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
    console.log(`[web-search] error ${`https://html.duckduckgo.com/html/?q=${encodeURIComponent(req.body.q)}`} ${(e as any).name} ${(e as any).message}`);
    next(e);
  }
};
