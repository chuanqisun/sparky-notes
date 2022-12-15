import { load } from "cheerio";

export const CONSECUTIVE_WHITE_SPACE_PATTERN = /\s+/g;

export function getHighlightHtml(keywords: string[], tags: [openTag: string, closeTag: string], input: string): string {
  if (!keywords.length) return input;

  const pattern = new RegExp(
    `\\b(${keywords
      .sort((a, b) => b.length - a.length) // prioritize longer word
      .map(escapeRegExp)
      .join("|")})`,
    "gi"
  );

  return input.replace(pattern, (match) => `${tags[0]}${match}${tags[1]}`);
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export function findHighlightHtml(keywords: string[], tags: [openTag: string, closeTag: string], input: string): string | undefined {
  const maybeHighlighed = getHighlightHtml(keywords, tags, input);
  return maybeHighlighed === input ? undefined : maybeHighlighed;
}

export function getHighlightWords(selector: string, html: string): string[] {
  const $ = load(html);
  const rawWords = $(selector)
    .toArray()
    .map((element) => $(element).text() ?? "")
    .map((word) => word.trim().toLocaleLowerCase())
    .flatMap((word) => word.replace(CONSECUTIVE_WHITE_SPACE_PATTERN, " ").split(" "))
    .filter((word) => word);

  return [...new Set(rawWords)];
}
