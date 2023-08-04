export function combineWhitespace(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export function shortenToWordCount(wordCount: number, input: string): string {
  const words = input.split(" ");
  return words.slice(0, wordCount).join(" ") + (words.length > wordCount ? "..." : "");
}
