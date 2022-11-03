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

export const ftsGetIndex = once(() => new FlexDocument(indexConfig));
export const ftsAdd = (idx: FlexDocument<IndexedItem>, items: IndexedItem[]) => Promise.all(items.map((item) => idx.addAsync(item.id, item)));
export const ftsQuery = (idx: FlexDocument<IndexedItem>, query: string) => idx.searchAsync(query, { index: "keywords", limit: 100 });
export const ftsExportIndex = (idx: FlexDocument<IndexedItem>) => {
  const result: any = {};
  idx.export((key, val) => {
    result[key] = val;
  });

  return result;
};

export const getTokens = (query: string) =>
  query
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);

export const getTokensPattern = (tokens: string[]) => (tokens.length ? new RegExp(String.raw`\b(${tokens.join("|")})`, "gi") : null);

export function getHighlightHtml(tokensPattern: RegExp, query: string) {
  return query.replace(tokensPattern, (match) => `<mark>${match}</mark>`);
}
