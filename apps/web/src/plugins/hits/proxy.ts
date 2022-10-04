import type { FilterConfig, SearchOutput } from "./hits";
import { getFilterString, getOrderBy, getOrderByPublishDateClause } from "./search";

export async function searchHits(token: string, filter: FilterConfig): Promise<SearchOutput> {
  const result = await fetch("http://localhost:5202/api/search/index", {
    method: "post",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      count: true,
      queryType: "Full",
      searchText: "*",
      filter: getFilterString(filter),
      orderBy: getOrderBy(getOrderByPublishDateClause()),
    }),
  }).then((res) => res.json());

  return result;
}
