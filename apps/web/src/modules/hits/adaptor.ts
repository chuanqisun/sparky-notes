import { EntityType } from "./entity";
import type { HitsGraphChildNode, HitsGraphNode, SearchResultChild, SearchResultDocument } from "./hits";

export function searchResultDocumentToGraphNode(searchResult: SearchResultDocument[]): HitsGraphNode[] {
  return searchResult.map((document) => {
    const childNodes = toChildNodes(document.children);
    const updatedOn = getUpdatedOn(document);

    return {
      title: document.title ?? "Untitled",
      id: document.id,
      entityType: document.entityType,
      updatedOn: updatedOn,
      researchers: document.researchers.map(getPerson),
      tags: [...document.products, ...document.topics].map(getTag),
      group: {
        id: document.group.id,
        displayName: document.group.name,
      },
      children: childNodes,
    };
  });
}

function toChildNodes(children: SearchResultChild[]): HitsGraphChildNode[] {
  return children
    .filter((child) => [EntityType.Insight, EntityType.Recommendation].includes(child.entityType))
    .map((claim) => ({
      title: claim.title ?? "Untitled",
      id: claim.id,
      entityType: claim.entityType,
    }));
}

function getUpdatedOn(document: SearchResultDocument): Date {
  return [new Date(document.updatedOn), ...document.children.map((child) => new Date(child.updatedOn))]
    .sort((a, b) => b.getTime() - a.getTime()) // descending
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
