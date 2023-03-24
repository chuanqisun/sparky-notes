export function nonEmptyString(...strings: string[]) {
  return strings.find((string) => string.trim().length > 0);
}
