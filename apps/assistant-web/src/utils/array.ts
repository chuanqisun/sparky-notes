export function replaceArrayItem<T>(array: T[], index: number, newItem: T) {
  return [...array.slice(0, index), newItem, ...array.slice(index + 1)];
}
