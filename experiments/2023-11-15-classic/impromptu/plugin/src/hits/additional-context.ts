import { combineWhitespace, shortenToWordCount } from "../utils/text";
import { SearchResultChild, SearchResultItem } from "./hits";

export function getLongContext(reportContext: SearchResultItem, claimContext: SearchResultChild) {
  return [
    combineWhitespace(reportContext.document.title),
    shortenToWordCount(1000, combineWhitespace(reportContext.document.contents ?? "")),
    combineWhitespace(claimContext.title ?? ""),
    shortenToWordCount(500, combineWhitespace(claimContext.contents ?? "")),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function getShortContext(reportContext: SearchResultItem, claimContext: SearchResultChild) {
  return [shortenToWordCount(200, combineWhitespace(claimContext.contents ?? ""))].filter(Boolean).join(" ");
}
