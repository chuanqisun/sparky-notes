import { getUniqueFilter } from "../../utils/get-unique-filter";
import { htmlToText } from "../../utils/parser";
import { EntityType } from "./entity";
import { getHighlightHtml, getHighlightWords } from "./highlight";
import type { SearchResultDocument, SearchResultItem } from "./hits";

export interface HitsDisplayNode {
  children: HitsDisplayChildNode[];
  entityType: number;
  group: {
    id: number;
    displayName: string;
  };
  id: string;
  title: string;
  researchers: {
    id: number;
    displayName: string;
  }[];
  tags: {
    id: number;
    displayName: string;
  }[];
  titleHtml: string;
  researchersHtml: string;
  updatedOn: Date;
}
export interface HitsDisplayChildNode {
  entityType: number;
  hasHighlight: boolean;
  id: string;
  isNative: boolean;
  title: string;
  titleHtml: string;
}

export function formatDisplayNode(searchResult: SearchResultItem): HitsDisplayNode {
  const { document, highlights } = searchResult;

  const titleHighlightWords = [...new Set((highlights?.title ?? [])?.flatMap(extractBoldElements))];
  const childTitleHighlightWords = [...new Set((highlights?.["children/Title"] ?? [])?.flatMap(extractBoldElements))];
  const researcherWods = [...new Set((highlights?.["researchers/Name"] ?? [])?.flatMap(extractBoldElements))];
  const title = document.title.length ? document.title : "Untitled";
  const researchers = document.researchers.map(withDisplayName);
  const researchersString = researchers.map((r) => r.displayName).join(", ");
  const researchersHtml = getHighlightHtml(researcherWods, ["<mark>", "</mark>"], researchersString) ?? htmlToText(researchersString);

  return {
    title,
    titleHtml: getHighlightHtml(titleHighlightWords, ["<mark>", "</mark>"], document.title) ?? htmlToText(title),
    id: document.id,
    entityType: document.entityType,
    updatedOn: getUpdatedOn(document),
    researchers,
    researchersHtml,
    tags: [...document.products, ...document.topics].map(withDisplayName),
    group: {
      id: document.group.id,
      displayName: document.group.name,
    },
    children: searchResult.document.children
      .filter(isClaimType)
      .filter((claim) => Boolean(claim.title))
      .map((claim) => {
        const childTitle = claim.title?.trim()?.length ? claim.title.trim() : "Untitled";
        const childTitleHtml = getHighlightHtml(childTitleHighlightWords, ["<mark>", "</mark>"], childTitle) ?? htmlToText(childTitle);

        return {
          title: childTitle,
          titleHtml: childTitleHtml,
          hasHighlight: childTitle !== childTitleHtml,
          id: claim.id,
          entityType: claim.entityType,
          isNative: claim.isNative,
        };
      })
      .filter(uniqueById),
  };
}

export const isClaimType = (item: { entityType: number }) => [EntityType.Insight, EntityType.Recommendation].includes(item.entityType);

const uniqueById = getUniqueFilter<{ id: any }>((a, b) => a.id === b.id);

const extractBoldElements = (html: string) => getHighlightWords("b", html);

function getUpdatedOn(document: SearchResultDocument): Date {
  return [...document.children.map((child) => new Date(child.updatedOn)), new Date(document.updatedOn)] // Parent usually has latest timestamp
    .sort((a, b) => a.getTime() - b.getTime()) // Ascending because the array above is likely partially ascending
    .pop()!; // most recent date
}

function withDisplayName(namedEntity: { id: number; name: string }) {
  return {
    id: namedEntity.id,
    displayName: namedEntity.name,
  };
}
