import { type CognitiveSearchInput, type CognitiveSearchOutput } from "../azure/cognitive-search";
import { type H20Proxy } from "./proxy";

export function getClaimCountInput(filter: string): CognitiveSearchInput {
  return {
    count: true,
    filter,
    search: "*",
    searchFields: "",
    top: 0,
    skip: 0,
  };
}

export function getClaimsPageInput(filter: string, top: number, skip: number): CognitiveSearchInput {
  return {
    count: false,
    filter,
    search: "*",
    searchFields: "",
    top,
    skip,
  };
}

export function getSemanticSearchInput(query: string, top: number): CognitiveSearchInput {
  // ref: https://learn.microsoft.com/en-us/azure/search/semantic-how-to-query-request?tabs=rest%2Crest-query
  return {
    captions: "extractive|highlight-false",
    count: true,
    search: query,
    queryType: "semantic",
    queryLanguage: "en-us",
    semanticConfiguration: "similar-claims",
    top,
  };
}

export type SemanticSearchProxy = (input: CognitiveSearchInput) => Promise<CognitiveSearchOutput<ClaimDocument>>;
export function getSemanticSearchProxy(h20Proxy: H20Proxy): SemanticSearchProxy {
  return (input: CognitiveSearchInput) => h20Proxy(`/hits/search/claims`, input);
}

export interface ClaimDocument {
  ClaimContent: string;
  ClaimId: string;
  ClaimTitle: string;
  ClaimType: number;
  Methods: string[];
  Products: string[];
  Researchers: string[];
  RootDocumentContext: string;
  RootDocumentId: string;
  RootDocumentTitle: string;
  Topics: string[];
}
