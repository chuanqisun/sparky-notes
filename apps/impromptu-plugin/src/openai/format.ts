export function arrayToBulletList(arr: string[]) {
  return arr.map((item) => `- ${item}`).join("\n");
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

export function responseToBulletList(response: string) {
  return arrayToBulletList(responseToArray(response));
}
