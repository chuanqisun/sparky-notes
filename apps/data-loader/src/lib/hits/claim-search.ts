import { cognitiveSearchJsonProxy, type CognitiveSearchInput, type CognitiveSearchOutput } from "../azure/cognitive-search";

export function getClaimCountInput(entityType: number): CognitiveSearchInput {
  return {
    count: true,
    filter: `ClaimType eq ${entityType}`,
    search: "*",
    searchFields: "",
    top: 0,
    skip: 0,
  };
}

export function getClaimsPageInput(entityType: number, top: number, skip: number): CognitiveSearchInput {
  return {
    count: false,
    filter: `ClaimType eq ${entityType}`,
    search: "*",
    searchFields: "",
    top,
    skip,
  };
}

export function getClaimIndexProxy<InputType extends CognitiveSearchInput, OutputType extends CognitiveSearchOutput<ClaimDocument>>(apiKey: string) {
  return cognitiveSearchJsonProxy<CognitiveSearchInput, CognitiveSearchOutput<ClaimDocument>>(
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
