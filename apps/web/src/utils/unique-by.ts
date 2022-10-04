export function uniqueBy<T extends Record<string, any>>(fieldName: string, item: T, index: number, all: T[]): boolean {
  return index === all.findIndex((firstOccurance) => firstOccurance[fieldName] === item[fieldName]);
}
