import type { IndexOptionsForDocumentSearch } from "flexsearch";
import { Document as FlexDocument } from "flexsearch";
import type { HitsGraphChildNode, HitsGraphNode } from "../hits/hits";

// TODO do not export
export const indexConfig: IndexOptionsForDocumentSearch<IndexedItem> = {
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

export interface ExportedIndex {
  // Caution: User might have an older version in their IndexedDB
  config: IndexOptionsForDocumentSearch<IndexedItem>;
  // Caution: Dict must be in sync with config
  dict: Record<string, any>;
}

export const createFtsIndex = () => new FlexDocument(indexConfig);

// V2 Grandular index
export const addFtsItems = (idx: FlexDocument<IndexedItem>, items: IndexedItem[]) => Promise.all(items.map((item) => idx.addAsync(item.id, item)));
export const queryFts = (idx: FlexDocument<IndexedItem>, query: string) =>
  idx.searchAsync(query, { index: "keywords" }).then((results) => results[0]?.result ?? []);
export const exportFtsIndex = async (idx: FlexDocument<IndexedItem>) => {
  const dict: any = {};
  await idx.export((key, val) => {
    dict[key] = val;
  });
  // HACK due to https://github.com/nextapps-de/flexsearch/issues/274
  // Because Flexsearch export promise resolves prematurely,
  // We poll to ensure the largest chunk (fuzzyTokens.map) exists and then
  // give it another 1000ms to ensure everything else is saved
  await new Promise((resolve) => {
    const polling = setInterval(() => {
      // expecting 6 keys: <index>.cfg, <index>.ctx, <index>.map, reg, store, tag
      if (Object.keys(dict).length === 6 && Object.hasOwn(dict, "keywords.map")) {
        resolve(dict);
        clearInterval(polling);
      } else {
        // log to console for future debugging
        console.log(`Index export partial success. Will retry...`);
      }
    }, 100);
  });

  return {
    config: indexConfig,
    dict,
  } as ExportedIndex;
};
export const importFtsIndex = async <T extends FlexDocument<any>>(exportedIndex: ExportedIndex) => {
  const index = new FlexDocument(exportedIndex.config);
  await Promise.all(Object.entries(exportedIndex.dict).map(([key, value]) => index.import(key, value)));
  return index as T;
};

export const getTokens = (query: string) =>
  query
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);

const escape = {
  from: /[.*+?^${}()|[\]\\]/g,
  to: "\\$&",
};

export const getTokensPattern = (tokens: string[]) =>
  tokens.length ? new RegExp(String.raw`\b(${tokens.map((t) => t.replace(escape.from, escape.to)).join("|")})`, "gi") : null;

export function getHighlightHtml(tokensPattern: RegExp, query: string) {
  return query.replace(tokensPattern, (match) => `<mark>${match}</mark>`);
}

export interface HitsFtsNode extends HitsGraphNode {
  titleHtml: string;
  researchersHtml: string;
  children: HitsFtsCildNode[];
}
export interface HitsFtsCildNode extends HitsGraphChildNode {
  hasHighlight: boolean;
  titleHtml: string;
}

export function hitsGraphNodeToFtsNode(highlight: (input: string, onMatch?: () => any) => string, node: HitsGraphNode): HitsFtsNode {
  return {
    ...node,
    titleHtml: highlight(node.title),
    researchersHtml: highlight(node.researchers.map((person) => person.displayName).join(", ")),
    children: node.children.map((child) => {
      let hasHighlight = false;
      const titleHtml = highlight(child.title, () => (hasHighlight = true));
      return { ...child, titleHtml, hasHighlight: hasHighlight };
    }),
  };
}
