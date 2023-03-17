import assert from "assert";
import axios from "axios";
import * as cheerio from "cheerio";
import type { RequestHandler } from "express";

export interface ArxivSearchRequest {
  // See manual for syntax https://info.arxiv.org/help/api/user-manual.html
  q: string;
  limit: number;
}

export const arxivSearch: RequestHandler = async (req, res, next) => {
  try {
    const { q, limit } = req.body;
    assert(typeof q === "string");
    assert(typeof limit === "number");

    const url = `https://export.arxiv.org/api/query?search_query=${q}&max_results=${limit}`;
    console.log(`[arxiv-search] ${url}`);

    // crawl duckduckgo html results
    const response = await axios.request({ url });

    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $("entry").each((i, el) => {
      results.push({
        title: $("title", el).text().trim(),
        summary: $("summary", el).text().trim(),
        url: $("id", el).text(),
      });
    });

    res.status(response.status).json({
      entries: results,
    });

    next();
  } catch (e) {
    console.log(`[arxiv-search] query "${req.body.q}" ${(e as any).name} ${(e as any).message}`);
    next(e);
  }
};
