export interface RankedQA {
  query: string;
  responses: ClaimItem[];
}

export interface ClaimItem {
  id: string;
  entityType: number;
  title: string;
  score: number;
  caption: string;
}

export interface AggregatedItem extends ClaimItem {
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
