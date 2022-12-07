import { field, ifAll, ifAny } from "acs-expression-builder";
import axios from "axios";
import type { SearchOutput, SearchResultItem } from "./search-api";

const HITS_SEARCH_ENDPOINT = "https://hits-uat.microsoft.com/api/search";

export interface FindConfig {
  proxy: (payload: any) => Promise<SearchOutput>;
  filter: FindFilter;
}

export interface FindFilter {
  entityId: string;
}

export async function findOne({ proxy, filter }: FindConfig): Promise<SearchResultItem | null> {
  const payload = getFindPayload({ filter });
  const { results } = await proxy(payload);
  return results[0] ?? null;
}

export function getFindPayload(config: { filter: FindFilter }) {
  return {
    top: 1,
    skip: 0,
    filter: ifAll([
      field("IsActive").eq(true),
      ifAny([field("Id").eq(config.filter.entityId), field("Children").any((item) => item("Id").eq(config.filter.entityId))]),
    ]).toString(),
    queryType: "Simple",
    searchText: "*",
    select: [
      "Id",
      "EntityType",
      "Title",
      "Contents",
      "UpdatedOn",
      "Children/Id",
      "Children/Contents",
      "Children/EntityType",
      "Children/Title",
      "Children/UpdatedOn",
      "Researchers/Id",
      "Researchers/Name",
      "Products/Id",
      "Products/Name",
      "Topics/Id",
      "Topics/Name",
      "Group/Id",
      "Group/Name",
    ],
  };
}

export const getAuthenticatedProxy =
  (authorization: string) =>
  async <T extends any>(payload: any) => {
    const response = await axios({
      method: "post",
      url: `${HITS_SEARCH_ENDPOINT}/index`,
      headers: { Authorization: authorization },
      data: JSON.stringify(payload),
    });

    return response.data as T;
  };
