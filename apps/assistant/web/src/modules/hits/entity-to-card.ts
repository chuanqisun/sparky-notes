import type { CardData } from "@h20/assistant-types";
import { EntityBackgroundColor, EntityDisplayName, EntityName } from "./entity";

export function entityToCard(entityId: string, entityType: number, title: string) {
  const cardData: CardData = {
    category: EntityDisplayName[entityType],
    title: title,
    entityId: entityId,
    entityType: entityType,
    backgroundColor: EntityBackgroundColor[entityType],
    url: `https://hits.microsoft.com/${EntityName[entityType]}/${entityId}`,
  };

  return cardData;
}
