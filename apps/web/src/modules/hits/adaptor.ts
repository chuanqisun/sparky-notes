import type { IndexedItem } from "../fts/fts";
import type { EdgeSchema, NodeSchema } from "../graph/db";
import { EntityName, EntityType } from "./entity";
import type { HitsGraphChildNode, HitsGraphNode, SearchResultChild, SearchResultDocument } from "./hits";

export interface GraphOperation {
  upsertNode?: NodeSchema;
  setOutEdges?: EdgeSchema[];
}

export function searchResultToGraphOperations(searchResult: SearchResultDocument[]): GraphOperation[] {
  // TODO switch to outline to improve query performance

  return searchResult.flatMap((document) => {
    const upsertReportOps: GraphOperation = {
      upsertNode: {
        title: document.title.length ? document.title : "Untitled",
        id: document.id,
        entityType: document.entityType,
        updatedOn: new Date(document.updatedOn),
        researchers: document.researchers.map(getPerson),
        tags: [...document.products, ...document.topics].map(getTag),
        group: {
          id: document.group.id,
          displayName: document.group.name,
        },
      },
    };

    const qualifiedChildren = document.children.filter((child) => [EntityType.Insight, EntityType.Recommendation].includes(child.entityType));
    const upsertClaimOps: GraphOperation[] = qualifiedChildren.map((claim) => ({
      upsertNode: {
        title: claim.title?.length ? claim.title : "Untitled",
        id: claim.id,
        entityType: claim.entityType,
        updatedOn: new Date(claim.updatedOn),
      },
    }));

    const setReportToClaimEdgeOps: GraphOperation = {
      setOutEdges: qualifiedChildren.map((child, i) => ({
        from: document.id,
        to: child.id,
        updatedOn:
          upsertReportOps.upsertNode!.updatedOn > upsertClaimOps[i].upsertNode!.updatedOn
            ? upsertReportOps.upsertNode!.updatedOn
            : upsertClaimOps[i].upsertNode!.updatedOn, // the greater of parent and child
      })),
    };

    return [
      // upsert report node
      upsertReportOps,

      // upsert claim nodes
      ...upsertClaimOps,

      // set report->claim edges
      setReportToClaimEdgeOps,
    ];
  });
}

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

function toChildNodes(children: SearchResultChild[]): HitsGraphChildNode[] {
  return children
    .filter((child) => [EntityType.Insight, EntityType.Recommendation].includes(child.entityType))
    .map((claim) => ({
      title: claim.title?.length ? claim.title : "Untitled",
      id: claim.id,
      entityType: claim.entityType,
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
