import type { IndexOptionsForDocumentSearch } from "flexsearch";
import { Document as FlexDocument } from "flexsearch";
import { useCallback, useRef } from "preact/hooks";
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

  const add = useCallback((items: IndexedItem[]) => Promise.all(items.map((item) => idx.current.addAsync(item.id, item))), []);

  const query = useCallback((query: string) => idx.current.searchAsync(query, { index: "fuzzyTokens" }), []);

  const dump = useCallback(() => idx.current.export(console.log), []);

  return {
    add,
    query,
    dump,
  };
}
