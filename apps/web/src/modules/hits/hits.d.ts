import type { NodeSchema } from "../graph/db";

export interface HitsGraphNode extends NodeSchema {
  id: string;
  updatedOn: Date;
  title: string;
  entityType: number;
  group?: {
    id: number;
    displayName: string;
  };
  researchers: {
    id: number;
    displayName: string;
  }[];
  tags: {
    id: number;
    displayName: string;
  }[];
  children: HitsGraphChildNode[];
}

export interface HitsGraphChildNode {
  id: string;
  title: string;
  entityType: number;
}

export interface FilterConfig {
  ids?: string[];
  childIds?: string[];
  entityTypes?: number[];
  productIds?: number[];
  topicIds?: number[];
  groupIds?: number[];
  researcherIds?: number[];
  researcherDirectoryObjectIds?: string[];
  methodIds?: number[];
  publishDateNewerThan?: string;
}

export interface SearchOutput {
  totalCount: number;
  results: SearchResultItem[];
  spellChecked: boolean;
  spellCheckedText: string;
}

export interface SearchResultItem {
  score: number;
  document: SearchResultDocument;
  highlights: null | Record<HighlightableField, string[] | undefined>;
}

export type HighlightableField = "title" | "contents" | "children/Title" | "children/Contents";

export interface SearchResultDocument {
  id: string;
  abstract: string | null; // Collection only
  contents: string | null;
  entityType: number;
  title: string;
  products: SearchResultTag[];
  /** all timestamps are ISO format, e.g. `20201125T01:23:53Z` */
  createdOn: string;
  updatedOn: string;
  publishedOn: string;
  isActive: boolean; // false when report is deleted
  isPublished: boolean;
  methods: {
    id: number;
    name: string;
  }[];
  topics: SearchResultTag[];
  researchers: {
    alias: string;
    id: number;
    name: string;
  }[];
  people: {
    alias: string;
    id: number;
    name: string;
  }[];
  group: {
    id: number;
    name: string;
  };
  children: SearchResultChild[];
  /**
   * stringified version of {@link Outline}
   */
  outline: string;
}

export interface SearchResultChild {
  entityType: number;
  id: string;
  title: null | string;
  contents: null | string;
  displayIndex: number; // starts with 1
  nestLevel: number; // starts with 1
  parents: SearchResultChildParent[]; // top level claims point to the report as parent
  updatedOn: string;
  topics: SearchResultTag[];
  products: SearchResultTag[];
}
export interface SearchResultChildWithTitle extends SearchResultChild {
  title: string;
}

export interface SearchResultChildParent {
  id: number;
  level: number;
}

export interface SearchResultTag {
  id: number;
  name: string;
  /** `true` when this tag was added by user. `false` when it is the ancestor of a tag added by user */
  tagged: boolean;
}
