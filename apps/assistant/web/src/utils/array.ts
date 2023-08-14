export function replaceArrayItem<T>(array: T[], index: number, newItem: T) {
  return [...array.slice(0, index), newItem, ...array.slice(index + 1)];
}

export function flatItem<T extends { children?: T[] }>(item: T): T[] {
  return [item, ...(item.children?.map(flatItem) ?? [])].flat() as T[];
}
