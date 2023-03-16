import { parse } from "@postlight/parser";
import assert from "assert";
import axios from "axios";
import { load } from "cheerio";
import type { RequestHandler } from "express";

export interface WebCrawlResult {
  markdown: string;
  links: WebCrawlLink[];
}

export interface WebCrawlLink {
  title: string;
  href: string;
}

export const webCrawl: RequestHandler = async (req, res, next) => {
  try {
    const { url } = req.body;
    assert(typeof url === "string");

    const response = await axios.request({ url });

    if (!response.headers["content-type"]?.toString().toLocaleLowerCase().includes("text/html")) {
      throw new Error(`Invalid content type for crawler ${response.headers["content-type"]}`);
    }

    const parsedMarkdown = await parse(url, { contentType: "markdown", html: response.data });
    const parsedHTML = await parse(url, { contentType: "html", html: response.data });
    const $ = load(parsedHTML.content ?? "");
    const links: { title: string; href: string }[] = [];
    $("a[href]").each((index, link) => {
      const parsedLink = $(link);
      links.push({
        title: $(link).text(),
        href: $(link).attr("href")!,
      });
    });

    res.status(200).json({
      markdown: parsedMarkdown.content ?? "",
      links,
    });

    next();
  } catch (e) {
    console.log(`[web-crawl] error ${req.body.url} ${(e as any).name} ${(e as any).message}`);
    res.status(200).json({
      text: "",
    });
  }
};
