export function extractMarkdownTitle(markdown: string) {
  return markdown.match(/# (.*)/)?.[1] ?? "";
}
