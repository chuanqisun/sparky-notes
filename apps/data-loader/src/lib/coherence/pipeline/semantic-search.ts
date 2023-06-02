import { getSemanticSearchInput, type SemanticSearchProxy } from "../../hits/search-claims";

export interface RankedQA {
  query: string;
  maxScore: number;
  responses: SemanticResult[];
}

export interface SemanticResult {
  id: string;
  entityType: number;
  title: string;
  rootTitle: string;
  score: number;
  caption: string;
}

export interface AggregatedItem extends SemanticResult {
  queries: string[];
}
export function groupById(acc: AggregatedItem[], item: AggregatedItem) {
  const existing = acc.find((i) => i.id === item.id);
  if (existing) {
    if (existing.score < item.score) {
      existing.score = item.score;
      existing.queries.push(...item.queries);
    }
  } else {
    acc.push(item);
  }
  return acc;
}

export async function semanticSearch(searchProxy: SemanticSearchProxy, query: string, limit: number, minScore: number): Promise<RankedQA> {
  const result = await searchProxy(getSemanticSearchInput(query, limit));
  const responses =
    result.value
      ?.filter((doc) => doc["@search.rerankerScore"] > minScore)
      ?.map((doc) => ({
        id: doc.ClaimId,
        entityType: doc.ClaimType,
        title: doc.ClaimTitle,
        rootTitle: doc.RootDocumentTitle,
        score: doc["@search.rerankerScore"],
        caption: doc["@search.captions"].map((item) => item.text).join("..."),
      })) ?? [];

  return {
    query,
    maxScore: Math.max(...responses.map((item) => item.score), 0),
    responses,
  };
}

export async function bulkSemanticQuery(searchProxy: SemanticSearchProxy, queries: string[], limitPerQuery: number, minScore: number) {
  // generate concept name-only based queries
  const results = (await Promise.all(queries.map(async (query) => await semanticSearch(searchProxy, query, limitPerQuery, minScore)))).sort(
    (a, b) => b.maxScore - a.maxScore
  );
  return results;
}
