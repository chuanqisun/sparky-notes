import { htmlToText } from "../../utils/parser";
import { EntityType } from "./entity";
import type { HitsGraphChildNode, HitsGraphNode, SearchResultChild, SearchResultDocument, SearchResultItem } from "./hits";

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
