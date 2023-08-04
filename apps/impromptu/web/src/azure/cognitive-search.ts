export interface CognitiveSearchInput {
  answers?: `extractive|count-${number}`;
  captions?: "extractive" | `extractive|highlight-${"true" | "false"}`;
  count?: boolean;
  filter?: string;
  highlightFields?: string;
  orderBy?: string;
  queryLanguage?: string;
  queryType?: "simple" | "full" | "semantic";
  search: string;
  searchFields?: string;
  select?: string;
  semanticConfiguration?: string;
  skip?: number;
  top?: number;
}

export interface CognitiveSearchOutput<DocumentType> {
  "@odata.count"?: number;
  "@search.nextPageParameters"?: {
    count: number;
  };
  "@odata.nextLink"?: string;
  value?: SearchResultItem<DocumentType>[];
}

export type SearchResultItem<DocumentType> = DocumentType & {
  "@search.captions": SearchResultSemanticCaption[];
  "@search.score": number;
  "@search.rerankerScore": number;
};

export interface SearchResultSemanticCaption {
  text: string;
  highlights: string;
}
