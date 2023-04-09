export interface SearchProxy {
  searchClaims: (payload: SemanticPayload) => Promise<SemanticOutput>;
}

export function getSearchProxy(accessToken: string): SearchProxy {
  const searchClaims = async (payload: any) => {
    const result = await fetch(import.meta.env.VITE_HITS_CLAIM_SEARCH_ENDPOINT!, {
      method: "post",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => res.json());

    return result as SemanticOutput;
  };

  return {
    searchClaims,
  };
}

export interface SemanticPayload {
  queryType: "semantic";
  queryLanguage: "en-US";
  semanticConfiguration: "similar-claims";
  top?: number;
  skip?: number;
  search: string;
}

export function semanticPayload(query: string): SemanticPayload {
  return {
    queryType: "semantic",
    queryLanguage: "en-US",
    semanticConfiguration: "similar-claims",
    search: query,
  };
}

export interface SemanticOutput {
  value: SemanticItem[];
}

export interface SemanticItem {
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
