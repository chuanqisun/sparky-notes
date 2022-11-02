import { field, ifAll, ifAny } from "acs-expression-builder";
import { getPageOffsets } from "../../utils/chunk";
import { uniqueBy } from "../../utils/unique-by";
import type { FilterConfig, SearchOutput, SearchResultDocument } from "./hits";
import type { HitsGraphNode } from "./use-hits";

export async function search(proxy: (payload: any) => Promise<SearchOutput>, filter: FilterConfig) {
  // execute 1st search to get total
  const pageSize = 100;
  const payload = getSearchPayloadV2({ count: true, top: pageSize, skip: 0, filter });
  const { totalCount, results } = await proxy(payload);
  const pageOffsets = getPageOffsets(pageSize, totalCount);
  pageOffsets.shift(); // discard first page which is already available from previous query

  const pages = await Promise.all(
    pageOffsets.map(async (offset) => {
      const payload = getSearchPayloadV2({ count: false, top: pageSize, skip: offset, filter });
      return (await proxy(payload)).results;
    })
  );

  return [results, ...pages].flat().map((result) => result.document);
}

export function getSearchPayloadV2(config: { count: boolean; top: number; skip: number; filter: FilterConfig }) {
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

export function getClaimsFromSearchResultItemsV2(searchResult: SearchResultDocument[]): HitsGraphNode[] {
  const allClaims: HitsGraphNode[] = searchResult.flatMap((document) => {
    const claims = document.children
      .filter((child) => [1, 25].includes(child.entityType))
      .map((claim) => ({
        title: claim.title ?? "Untitled",
        id: claim.id,
        parentId: document.id,
        entityType: claim.entityType,
        updatedOn: new Date(claim.updatedOn),
      }));

    const report = {
      title: document.title ?? "Untitled",
      id: document.id,
      entityType: document.entityType,
      updatedOn: new Date(document.updatedOn),
      researchers: document.researchers.map((person) => ({ id: person.id, displayName: person.name })),
      tags: [...document.products, ...document.topics].map((tag) => ({ id: tag.id, displayName: tag.name })),
      group: {
        id: document.group.id,
        displayName: document.group.name,
      },
    };

    return [report, ...claims];
  });

  const uniqueClaims = allClaims.filter(uniqueBy.bind(null, "id"));

  return uniqueClaims;
}

export function getFilterString(filterConfig: FilterConfig, inverseFilterConfig?: FilterConfig) {
  return ifAll([
    field("IsActive").eq(true),
    ...(filterConfig.entityTypes?.length ? [isOneOfNumbers("EntityType", filterConfig.entityTypes)] : []),
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

function isOneOfNumbers(fieldName: string, candidates: number[]) {
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
