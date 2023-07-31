import { emit, pathToName, renderDeclaration } from "./emit-v3";
import { parse } from "./parse";

export function getType(input: any, rootName = "Root"): string {
  const root = parse(input);
  const code = emit(root, rootName);
  return code;
}

export function getArrayItemType(input: any[], rootName = "Item"): string {
  if (!Array.isArray(input)) throw new Error("Input is not an array");
  if (!input.length)
    return renderDeclaration({
      lValue: pathToName([rootName]),
      rValue: "any",
    });

  const root = parse(input);
  const itemRoot = root.children?.get(0);
  if (!itemRoot) throw new Error("Parser error: Did not find array item");
  const code = emit(itemRoot, rootName);
  return code;
}

console.log(getArrayItemType([1, 2]));
