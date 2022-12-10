import { field, ifAll, ifAny } from "acs-expression-builder";
import { getPageOffsets } from "../../utils/chunk";
import type { FilterConfig, SearchOutput, SearchResultItem } from "./hits";

export interface FindConfig {
  proxy: (payload: any) => Promise<SearchOutput>;
  filter: FindFilter;
}

export interface FindFilter {
  entityType: number;
  entityId: string;
}

export async function searchFirst({ proxy, filter }: FindConfig): Promise<SearchResultItem | null> {
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
      "Abstract",
      "Outline",
      // "ReportTextContent",
      "Contents",
      "UpdatedOn",
      "Children/Id",
      "Children/Contents",
      "Children/DisplayIndex",
      "Children/NestLevel",
      "Children/EntityType",
      "Children/Title",
      "Children/UpdatedOn",
      "Researchers/Id",
      "Researchers/Name",
      "Researchers/Alias",
      "Products/Id",
      "Products/Name",
      "Topics/Id",
      "Topics/Name",
      "Group/Id",
      "Group/Name",
    ],
  };
}

export interface SearchConfig {
  pageSize: number;
  proxy: (payload: any) => Promise<SearchOutput>;
  filter: FilterConfig;
  onProgress?: (progress: SearchProgress) => any;
}
export interface SearchProgress {
  items: SearchResultItem[];
  total: number;
  success: number;
}
export interface SearchSummary {
  total: number;
  success: number;
  hasError: boolean;
}
export async function search({ proxy, filter, onProgress, pageSize }: SearchConfig): Promise<SearchSummary> {
  // execute 1st search to get total
  const payload = getSearchPayload({ count: true, top: pageSize, skip: 0, filter });
  const { totalCount, results } = await proxy(payload);

  let success = results.length;
  let hasError = false;

  onProgress?.({
    items: results,
    total: totalCount,
    success,
  });

  const pageOffsets = getPageOffsets(pageSize, totalCount);
  pageOffsets.shift(); // discard first page which is already available from previous query

  await Promise.all(
    pageOffsets.map(async (offset) => {
      const payload = getSearchPayload({ count: false, top: pageSize, skip: offset, filter });
      return proxy(payload)
        .then(({ results }) =>
          onProgress?.({
            items: results,
            total: totalCount,
            success: (success += results.length),
          })
        )
        .catch(() => (hasError = true));
    })
  );

  return {
    total: totalCount,
    success,
    hasError,
  };
}

export function getSearchPayload(config: { count: boolean; top: number; skip: number; filter: FilterConfig }) {
  return {
    count: config.count,
    top: config.top,
    skip: config.skip,
    filter: getFilterString(config.filter),
    queryType: "Simple",
    searchText: "*",
    select: [
      "Id",
      "EntityType",
      "Title",
      "UpdatedOn",
      "Children/Id",
      "Children/EntityType",
      "Children/Title",
      "Children/UpdatedOn",
      "Children/IsNative",
      "Researchers/Id",
      "Researchers/Name",
      "Products/Id",
      "Products/Name",
      "Topics/Id",
      "Topics/Name",
      "Group/Id",
      "Group/Name",
    ],
    orderBy: getOrderBy(getOrderByPublishDateClause()),
  };
}

export function getFilterString(filterConfig: FilterConfig, inverseFilterConfig?: FilterConfig) {
  return ifAll([
    field("IsActive").eq(true),
    ...(filterConfig.ids?.length ? [isOneOfValues("Id", filterConfig.ids)] : []),
    ...(filterConfig.entityTypes?.length ? [isOneOfValues("EntityType", filterConfig.entityTypes)] : []),
    ...(inverseFilterConfig?.entityTypes?.length ? [isNoneOfNumbers("EntityType", inverseFilterConfig.entityTypes)] : []),
    ...(filterConfig.productIds?.length ? [hasOneOfIds("Products", filterConfig.productIds)] : []),
    ...(filterConfig.topicIds?.length ? [hasOneOfIds("Topics", filterConfig.topicIds)] : []),
    ...(filterConfig.methodIds?.length ? [hasOneOfIds("Methods", filterConfig.methodIds)] : []),
    ...(filterConfig.groupIds?.length ? [isOneOfIds("Group", filterConfig.groupIds)] : []),
    ...(filterConfig.researcherIds?.length ? [hasOneOfIds("Researchers", filterConfig.researcherIds)] : []),
    ...(filterConfig.researcherDirectoryObjectIds?.length
      ? [hasOneOfValues("Researchers", "DirectoryObjectId", filterConfig.researcherDirectoryObjectIds)]
      : []),
    ...(filterConfig.publishDateNewerThan ? [isNewerThan("UpdatedOn", filterConfig.publishDateNewerThan)] : []),
  ]).toString();
}

function isNewerThan(fieldName: string, lowerOpen: string) {
  return field(fieldName).gt(new Date(lowerOpen));
}

function hasOneOfIds(fieldName: string, candidates: number[]) {
  return hasOneOfValues(fieldName, "Id", candidates);
}

function hasOneOfValues(fieldName: string, key: string, values: (string | number)[]) {
  return field(fieldName).any((item) => ifAny(values.map((value) => item(key).eq(value))));
}

function isOneOfIds(fieldName: string, candidates: number[]) {
  return ifAny(candidates.map((id) => field(fieldName).field("Id").eq(id)));
}

function isOneOfValues(fieldName: string, candidates: (number | string)[]) {
  return ifAny(candidates.map((candidate) => field(fieldName).eq(candidate)));
}

function isNoneOfNumbers(fieldName: string, candidates: number[]) {
  return ifAll(candidates.map((candidate) => field(fieldName).ne(candidate)));
}

interface OrderByClause {
  fieldPath: string;
  /** Default to `"asc"` */
  direction?: "asc" | "desc";
}

export function getOrderByPublishDateClause(): OrderByClause[] {
  return [
    {
      fieldPath: "PublishedOn",
      direction: "desc",
    },
  ];
}

export function getOrderBy(clauses: OrderByClause[]): string[] {
  return clauses.map((clause) => `${clause.fieldPath} ${clause.direction ?? "asc"}`);
}
