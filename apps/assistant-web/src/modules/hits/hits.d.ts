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

export type HighlightableField = "id" | "title" | "contents" | "children/Id" | "children/Title" | "children/Contents" | "researchers/Name";

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
   * stringified version of {@link SearchResultOutline}
   */
  outline: string;
}

export interface SearchResultOutline {
  children: SearchResultOutlineChild[];
}

export interface SearchResultOutlineChild {
  id: number;
  entityType: number;
  children: SearchResultOutlineChild[];
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
  isNative: boolean;
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
