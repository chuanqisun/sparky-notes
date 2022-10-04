import { field, ifAll, ifAny } from "acs-expression-builder";
import { uniqueBy } from "../../utils/unique-by";
import type { FilterConfig, SearchResultItem } from "./hits";
import type { HitsGraphNode } from "./use-hits";

export function getClaimsFromSearchResultItemsV2(searchResult: SearchResultItem[]): HitsGraphNode[] {
  const allClaims: HitsGraphNode[] = searchResult
    .map((reportResult) => reportResult.document)
    .flatMap((document) => {
      const claims = document.children
        .filter((child) => [1, 25].includes(child.entityType))
        .map((claim) => ({
          title: claim.title ?? "Untitled",
          id: claim.id,
          entityType: claim.entityType,
          details: claim.contents?.trim().slice(0, 255) ?? "",
          updatedOn: claim.updatedOn,
          targets: [],
        }));

      const report = {
        title: document.title ?? "Untitled",
        id: document.id,
        entityType: document.entityType,
        details: document.contents?.trim().slice(0, 255) ?? "",
        updatedOn: document.updatedOn,
        targets: claims.map((claim) => ({
          id: claim.id,
          entityType: claim.entityType,
          relation: "contains",
        })),
      };

      return [report, ...claims];
    });

  const uniqueClaims = allClaims.filter(uniqueBy.bind(null, "id"));

  return uniqueClaims;
}

export function getClaimsFromSearchResultItems(searchResult: SearchResultItem[]): HitsGraphNode[] {
  const allClaims: HitsGraphNode[] = searchResult
    .flatMap((reportResult) => reportResult.document.children)
    .filter((child) => [1, 25].includes(child.entityType))
    .map((claim, index) => ({
      title: claim.title ?? "Untitled",
      id: claim.id,
      entityType: claim.entityType,
      details: claim.contents?.trim().slice(0, 255) ?? "",
      updatedOn: claim.updatedOn,
      targets: [],
    }));

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
    ...(filterConfig.publishDateRange?.length === 2 ? [isInTimeRange("PublishedOn", filterConfig.publishDateRange)] : []),
  ]).toString();
}

function isInTimeRange(fieldName: string, range: [lowerOpen: string, upperClosed: string]) {
  return field(fieldName).gt(new Date(range[0])).and.field(fieldName).le(new Date(range[1]));
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
