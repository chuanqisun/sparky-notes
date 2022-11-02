import { uniqueBy } from "../../utils/unique-by";
import { EntityTypes } from "./entity";
import type { HitsGraphNode, SearchResultDocument } from "./hits";

export function searchResultDocumentToGraphNode(searchResult: SearchResultDocument[]): HitsGraphNode[] {
  const allNodes: HitsGraphNode[] = searchResult.flatMap((document) => {
    const claims = document.children
      .filter((child) => [EntityTypes.Insight, EntityTypes.Recommendation].includes(child.entityType))
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
  const uniqueClaims = allNodes.filter(uniqueBy.bind(null, "id"));

  return uniqueClaims;
}
