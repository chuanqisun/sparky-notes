import { parse } from "@postlight/parser";
import assert from "assert";
import axios from "axios";
import { load } from "cheerio";
import type { RequestHandler } from "express";

export interface WebCrawlResult {
  markdown: string;
  text: string;
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

    const response = await axios.request({ url, timeout: 10000 });

    if (!response.headers["content-type"]?.toString().toLocaleLowerCase().includes("text/html")) {
      throw new Error(`Invalid content type for crawler ${response.headers["content-type"]}`);
    }

    const parsedMarkdown = await parse(url, { contentType: "markdown", html: response.data });
    const parsedText = await parse(url, { contentType: "text", html: response.data });
    const parsedHTML = await parse(url, { contentType: "html", html: response.data });
    const $ = load(parsedHTML.content ?? "");
    const links: { title: string; href: string }[] = [];
    $("a[href]").each((index, link) => {
      try {
        const parsedLink = $(link);
        const parsedURL = new URL(parsedLink.attr("href") ?? "");
        if (!parsedURL.protocol.startsWith("http")) {
          throw new Error(`Invalida URL ${parsedURL.href}`);
        }

        links.push({
          title: parsedLink.text(),
          href: parsedLink.attr("href")!,
        });
      } catch (e) {
        console.log(`Invalid href`, e);
      }
    });

    res.status(200).json({
      markdown: (parsedMarkdown.content ?? "").replace(/\n+/g, "\n").trim(),
      text: (parsedText.content ?? "").replace(/\n+/g, "\n").trim(),
      links,
    });

    next();
  } catch (e) {
    console.log(`[web-crawl] error ${req.body.url} ${(e as any).name} ${(e as any).message}`);
    res.status(200).json({
      markdown: "",
      text: "",
      links: [],
    });
  }
};
