import type { IndexedItem } from "../fts/fts";
import { EntityName, EntityType } from "./entity";
import type { HitsGraphChildNode, HitsGraphNode, SearchResultChild, SearchResultDocument } from "./hits";

export function searchResultDocumentToGraphNode(searchResult: SearchResultDocument[]): HitsGraphNode[] {
  return searchResult.map((document) => {
    const childNodes = toChildNodes(document.children);
    const updatedOn = getUpdatedOn(document);

    return {
      title: document.title.length ? document.title : "Untitled",
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

export function graphNodeToFtsDocument(node: HitsGraphNode): IndexedItem {
  const keywords = `${EntityName[node.entityType]}; ${node.title}; ${node.group?.displayName ?? ""}; ${
    node.researchers.map((person) => person.displayName).join(", ") ?? ""
  }; ${new Date(node.updatedOn).toLocaleDateString()}; ${node.children.map((child) => `${child.entityType}; ${child.title}`).join("; ")}`;

  return {
    id: node.id,
    keywords,
  };
}

// V2: Granular
export function graphNodeToFtsDocuments(node: HitsGraphNode): IndexedItem[] {
  const report: IndexedItem = {
    id: node.id,
    keywords: `${EntityName[node.entityType]}; ${node.title}; ${node.group.displayName ?? ""}; ${
      node.researchers.map((person) => person.displayName).join(", ") ?? ""
    }; ${new Date(node.updatedOn).toLocaleDateString()}`,
  };

  const claims: IndexedItem[] = node.children.map((child) => ({
    id: child.id,
    keywords: `${EntityName[child.entityType]}; ${child.title}`,
  }));

  return [report, ...claims];
}

function toChildNodes(children: SearchResultChild[]): HitsGraphChildNode[] {
  return children
    .filter((child) => [EntityType.Insight, EntityType.Recommendation].includes(child.entityType))
    .map((claim) => ({
      title: claim.title?.length ? claim.title : "Untitled",
      id: claim.id,
      entityType: claim.entityType,
      isNative: claim.isNative,
    }));
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
