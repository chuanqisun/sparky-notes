const DEFAULT_COMPARE = (a: any, b: any) => a === b;

export function getUniqueFilter<T>(isEqual: (a: T, b: T) => boolean = DEFAULT_COMPARE) {
  return function isUnique(candidateInstance: T, index: number, self: T[]) {
    return index === self.findIndex((firstInstance) => isEqual(candidateInstance, firstInstance));
  };
}
