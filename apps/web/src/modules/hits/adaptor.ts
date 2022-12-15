import { getUniqueFilter } from "../../utils/get-unique-filter";
import { htmlToText } from "../../utils/parser";
import { EntityType } from "./entity";
import { findHighlightHtml, getHighlightWords } from "./highlight";
import type { HitsGraphChildNode, HitsGraphNode, SearchResultChild, SearchResultDocument, SearchResultItem } from "./hits";

export interface HitsDisplayNode extends HitsGraphNode {
  titleHtml: string;
  researchersHtml: string;
  children: HitsDisplayChildNode[];
}
export interface HitsDisplayChildNode extends HitsGraphChildNode {
  hasHighlight: boolean;
  titleHtml: string;
}

export function formatDisplayNodeV2(searchResult: SearchResultItem): HitsDisplayNode {
  const { document, highlights } = searchResult;

  const extractBoldElements = (html: string) => getHighlightWords("b", html);
  const titleHighlightWords = [...new Set((highlights?.title ?? [])?.flatMap(extractBoldElements))];
  const childTitleHighlightWords = [...new Set((highlights?.["children/Title"] ?? [])?.flatMap(extractBoldElements))];
  const researcherWods = [...new Set((highlights?.["researchers/Name"] ?? [])?.flatMap(extractBoldElements))];
  const uniqueChildFilter = getUniqueFilter<{ id: any }>((a, b) => a.id === b.id);

  const title = document.title.length ? document.title : "Untitled";
  const researchers = document.researchers.map(getPerson);
  const researchersString = researchers.map((r) => r.displayName).join(", ");
  const researchersHtml = findHighlightHtml(researcherWods, ["<mark>", "</mark>"], researchersString) ?? htmlToText(researchersString);

  return {
    title,
    titleHtml: findHighlightHtml(titleHighlightWords, ["<mark>", "</mark>"], document.title) ?? htmlToText(title),
    id: document.id,
    entityType: document.entityType,
    updatedOn: getUpdatedOn(document),
    researchers,
    researchersHtml,
    tags: [...document.products, ...document.topics].map(getTag),
    group: {
      id: document.group.id,
      displayName: document.group.name,
    },
    children: searchResult.document.children
      .filter(isClaimType)
      .filter((claim) => Boolean(claim.title))
      .map((claim) => {
        const childTitle = claim.title?.trim()?.length ? claim.title.trim() : "Untitled";
        const childTitleHtml = findHighlightHtml(childTitleHighlightWords, ["<mark>", "</mark>"], childTitle) ?? htmlToText(childTitle);
        if (childTitle !== childTitleHtml) console.log([childTitle, childTitleHtml]);
        return {
          title: childTitle,
          titleHtml: childTitleHtml,
          hasHighlight: childTitle !== childTitleHtml,
          id: claim.id,
          entityType: claim.entityType,
          isNative: claim.isNative,
        };
      })
      .filter(uniqueChildFilter),
  };
}

export function searchResultsDisplayNodes(
  searchResult: SearchResultItem[],
  getChildren: (parentNode: SearchResultItem) => HitsGraphChildNode[]
): HitsGraphNode[] {
  return searchResult.map((item) => {
    const { document } = item;

    return {
      title: document.title.length ? document.title : "Untitled",
      id: document.id,
      entityType: document.entityType,
      updatedOn: getUpdatedOn(document),
      researchers: document.researchers.map(getPerson),
      tags: [...document.products, ...document.topics].map(getTag),
      group: {
        id: document.group.id,
        displayName: document.group.name,
      },
      children: getChildren(item),
    };
  });
}

export const isClaimType = (item: { entityType: number }) => [EntityType.Insight, EntityType.Recommendation].includes(item.entityType);

export const getHighlightDict = (htmlList: string[]) => htmlList.map((html) => [htmlToText(html), html] as [text: string, html: string]);

export function searchResultChildToHitsGraphChild(claim: SearchResultChild): HitsGraphChildNode {
  return {
    title: claim.title?.length ? claim.title : "Untitled",
    id: claim.id,
    entityType: claim.entityType,
    isNative: claim.isNative,
  };
}

function getUpdatedOn(document: SearchResultDocument): Date {
  return [...document.children.map((child) => new Date(child.updatedOn)), new Date(document.updatedOn)] // Parent usually has latest timestamp
    .sort((a, b) => a.getTime() - b.getTime()) // Ascending because the array above is likely partially ascending
    .pop()!; // most recent date
}

function getPerson(searchResultPerson: { id: number; name: string }) {
  return {
    id: searchResultPerson.id,
    displayName: searchResultPerson.name,
  };
}

function getTag(searchResultTag: { id: number; name: string }) {
  return {
    id: searchResultTag.id,
    displayName: searchResultTag.name,
  };
}
