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

export function responseToList(rawText: string) {
  return {
    listType: getListType(rawText),
    listItems: coerceToFlatArray(rawText),
  };
}

export function getListType(rawText: string): "ordered" | "unordered" | "none" {
  for (const line of rawText.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.match(/^\d+\./) || trimmed.match(/^\(\d+\)/) || trimmed.match(/^\d+\)/)) {
      return "ordered";
    }
    if (trimmed.match(/^-\s+/) || trimmed.match(/^\*\s+/)) {
      return "unordered";
    }
  }

  return "none";
}

function coerceToFlatArray(rawText: string) {
  return rawText
    .split("\n")
    .map((line) =>
      line
        .trim()
        .replace(/^(\(?\d+\)|\d+\.|-|\*)\s*/, "")
        .trim()
    )
    .filter(Boolean);
}
