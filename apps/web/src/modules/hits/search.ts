import { field, ifAll, ifAny } from "acs-expression-builder";
import type { H20Proxy } from "../h20/proxy";
import type { FilterConfig, SearchOutput, SearchResultItem } from "./hits";

export interface FindConfig {
  proxy: H20Proxy;
  filter: FindFilter;
}

export interface FindFilter {
  entityType: number;
  entityId: string;
}

export async function searchFirst({ proxy, filter }: FindConfig): Promise<SearchResultItem | null> {
  const payload = getFindPayload({ filter });
  const { results } = await proxy<any, SearchOutput>("/hits/api/search/index", payload);
  return results[0] ?? null;
}

export function getLanguageModelRawQuery(config: { query?: string; count?: boolean; top?: number; skip?: number; filter?: FilterConfig; orderBy?: string[] }) {
  return {
    count: config.count ?? false,
    top: config.top ?? 10,
    skip: config.skip ?? 0,
    filter: getFilterString(config.filter ?? {}),
    queryType: "Simple",
    searchText: config.query ?? "*",
    select: [
      "Id",
      "EntityType",
      "Title",
      "Abstract",
      "Contents",
      "ReportTextContent",
      "Outline",
      "Products",
      "Topics",
      "Methods",
      "Researchers/Name",
      "Researchers/JobTitle",
      "Children/Id",
      "Children/EntityType",
      "Children/Title",
      "Children/Contents",
      "Children/Products",
      "Children/Topics",
    ],
    orderBy: config.orderBy,
  };
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

export interface SearchConfigV2 {
  proxy: (payload: any) => Promise<SearchOutput>;
  filter: FilterConfig;
  top?: number;
  skip?: number;
  orderBy?: string[];
  query: string;
}

export function getSearchPayloadV2(config: { query: string; count: boolean; top: number; skip: number; filter: FilterConfig; orderBy?: string[] }) {
  return {
    count: config.count,
    top: config.top,
    skip: config.skip,
    filter: getFilterString(config.filter),
    queryType: "Simple",
    searchText: config.query,
    searchFields: ["Id", "Title", "Children/Id", "Children/Title", "Researchers/Name"],
    highlightFields: ["Id", "Title", "Children/Id", "Children/Title", "Researchers/Name"],
    select: [
      "Id",
      "EntityType",
      "Title",
      "Outline",
      "UpdatedOn",
      "Children/Id",
      "Children/EntityType",
      "Children/Title",
      "Children/UpdatedOn",
      "Researchers/Id",
      "Researchers/Name",
    ],
    orderBy: config.orderBy,
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
