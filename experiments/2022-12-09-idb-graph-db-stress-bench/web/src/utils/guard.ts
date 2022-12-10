export function isTruthy<T>(item: T | undefined): item is T {
  return Boolean(item);
}
