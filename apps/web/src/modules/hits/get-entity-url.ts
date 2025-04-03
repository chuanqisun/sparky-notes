import { EntityName } from "./entity";

export function getEntityUrl(entityType: number, entityId: string): string {
  return `https://hits.microsoft.com/${EntityName[entityType]}/${entityId}`;
}
