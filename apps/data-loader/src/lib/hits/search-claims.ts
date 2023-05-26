import { getCognitiveSearchJsonProxy, type CognitiveSearchInput, type CognitiveSearchOutput } from "../azure/cognitive-search";

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
    search: query,
    queryType: "semantic",
    queryLanguage: "en-us",
    semanticConfiguration: "similar-claims",
    top,
  };
}

export function getClaimIndexProxy<InputType extends CognitiveSearchInput, OutputType extends CognitiveSearchOutput<ClaimDocument>>(apiKey: string) {
  return getCognitiveSearchJsonProxy<CognitiveSearchInput, CognitiveSearchOutput<ClaimDocument>>(
    apiKey,
    `https://hits-stage.search.windows.net/indexes/hits-claims/docs/search?api-version=2021-04-30-Preview`!
  );
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
