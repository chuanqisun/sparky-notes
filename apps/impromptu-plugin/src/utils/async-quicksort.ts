export interface Settlement<T> {
  pivot: T;
  left?: T;
  right?: T;
}
export async function asyncQuicksort<T>(
  array: T[],
  compare: (a: T, b: T) => Promise<number>,
  onElement: (x: T) => any,
  onPivot: (x: T) => any,
  onPairSettled: (settlement: Settlement<T>) => any,
  shouldAbort?: () => boolean
): Promise<T[]> {
  if (array.length <= 1) {
    if (array.length) onPivot(array[0]);
    return array;
  }

  const pivot = array[0];
  onPivot(array[0]);
  const rest = array.slice(1);

  const left: T[] = [];
  const right: T[] = [];

  for (const element of rest) {
    if (shouldAbort?.()) return [];
    onElement(element);
    const comparison = await compare(element, pivot);
    if (comparison < 0) {
      left.push(element);
    } else {
      right.push(element);
    }
  }

  const sortedLeft = await asyncQuicksort(left, compare, onElement, (x) => onPairSettled({ pivot, left: x }), onPairSettled, shouldAbort);
  const sortedRight = await asyncQuicksort(right, compare, onElement, (x) => onPairSettled({ pivot, right: x }), onPairSettled, shouldAbort);

  return sortedLeft.concat(pivot, sortedRight);
}
