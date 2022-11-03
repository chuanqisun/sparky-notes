import type { IndexOptionsForDocumentSearch } from "flexsearch";
import { Document as FlexDocument } from "flexsearch";
import { once } from "../../utils/once";

const indexConfig: IndexOptionsForDocumentSearch<IndexedItem> = {
  preset: "default",
  charset: "latin:simple",
  tokenize: "forward",
  stemmer: false,
  document: {
    id: "id",
    index: ["keywords"],
  },
};

export interface IndexedItem {
  id: string;
  keywords: string;
}

export const getIndex = once(() => new FlexDocument(indexConfig));
export const add = (idx: FlexDocument<IndexedItem>, items: IndexedItem[]) => Promise.all(items.map((item) => idx.addAsync(item.id, item)));
export const query = (idx: FlexDocument<IndexedItem>, query: string) => idx.searchAsync(query, { index: "keywords", limit: 100 });
export const dump = (idx: FlexDocument<IndexedItem>) => idx.export(console.log);

export const getTokens = (query: string) =>
  query
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);

export const getTokensPattern = (tokens: string[]) => (tokens.length ? new RegExp(String.raw`\b(${tokens.join("|")})`, "gi") : null);

export function getHighlightHtml(tokensPattern: RegExp, query: string) {
  return query.replace(tokensPattern, (match) => `<mark>${match}</mark>`);
}
