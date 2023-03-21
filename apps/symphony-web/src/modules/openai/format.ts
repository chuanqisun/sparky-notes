export function arrayToBulletList(arr: string[]) {
  return arr.map((item) => `- ${item}`).join("\n");
}

export function arrayToNumberedList(arr: string[]) {
  return arr.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

export function responseToArray(rawText: string) {
  return rawText
    .split("\n")
    .map((line) =>
      line
        .trim()
        .replace(/^\d+\.\s*/, "")
        .replace(/^-\s*/, "")
        .replace(/^\*\s*/, "")
        .trim()
    )
    .filter(Boolean);
}

export function coerceToBulletList(response: string) {
  return arrayToBulletList(responseToArray(response));
}

export function coerceToNumberedList(response: string) {
  return arrayToNumberedList(responseToArray(response));
}
