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

export function parseFunctionDeclaration<ParamsType extends any[], ReturnType>(src: string): (...args: ParamsType) => ReturnType {
  const functionParams =
    src
      ?.match(/function\s*.+?\((.+?)\)/m)?.[1]
      .trim()
      ?.split(",")
      .map((i) => i.trim())
      .filter(Boolean) ?? [];

  const functionBody = src?.match(/function\s*.+?\s*\{((.|\n)*)\}/m)?.[1].trim() ?? "";
  if (!functionBody) throw new Error("Function body not found between curly braces");

  const parsedFunction = new Function(...[...functionParams, functionBody]) as (...args: ParamsType) => ReturnType;
  return parsedFunction;
}
