import type { IndexOptionsForDocumentSearch } from "flexsearch";
import { Document as FlexDocument } from "flexsearch";
import { useCallback, useMemo, useRef } from "preact/hooks";
import { once } from "../../utils/once";

const indexConfig: IndexOptionsForDocumentSearch<IndexedItem> = {
  preset: "default",
  charset: "latin:simple",
  tokenize: "forward",
  stemmer: false,
  document: {
    id: "id",
    index: ["fuzzyTokens"],
  },
};

export interface IndexedItem {
  id: string;
  fuzzyTokens: string;
}

const getIndex = once(() => new FlexDocument(indexConfig));

export function useSearch() {
  const idx = useRef(getIndex());

  // TODO add should cause query and dump behavior to update
  const add = useCallback((items: IndexedItem[]) => Promise.all(items.map((item) => idx.current.addAsync(item.id, item))), []);

  const query = useCallback((query: string) => idx.current.searchAsync(query, { index: "fuzzyTokens", limit: 10 }), []);

  const dump = useCallback(() => idx.current.export(console.log), []);

  return {
    add,
    query,
    dump,
  };
}

export function useHighlight(query: string) {
  const tokens = useMemo(
    () =>
      query
        .split(" ")
        .map((item) => item.trim())
        .filter(Boolean),
    [query]
  );
  const tokensPattern = useMemo(() => (tokens.length ? new RegExp(String.raw`\b(${tokens.join("|")})`, "gi") : null), [tokens]);
  const getHighlightHtml = useMemo(
    () => (input: string) => tokensPattern ? input.replace(tokensPattern, (match) => `<mark>${match}</mark>`) : input,
    [tokensPattern]
  );

  return {
    getHighlightHtml,
  };
}
