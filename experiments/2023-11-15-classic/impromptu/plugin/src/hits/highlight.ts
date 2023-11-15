export const CONSECUTIVE_WHITE_SPACE_PATTERN = /\s+/g;

export function removeHighlightHtml(html: string): string {
  return html.replace(/<b>|<\/b>/g, "");
}

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

export function getHighlightWords(pattern: RegExp, html: string): string[] {
  const rawWords = [...html.matchAll(pattern)]
    .map((match) => match[1])
    .map((word) => word.trim().toLocaleLowerCase())
    .flatMap((word) => word.replace(CONSECUTIVE_WHITE_SPACE_PATTERN, " ").split(" "))
    .filter((word) => word);

  return [...new Set(rawWords)];
}
