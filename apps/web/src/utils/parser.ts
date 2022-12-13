import { load } from "cheerio";

export function htmlToText(html: string): string {
  return load(html).text();
}
