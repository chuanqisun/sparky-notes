import { getJsonTypeTree, type JsonTypeNode } from "./get-json-type-tree";

export function jsonTypeToTypescript(jsonNode: JsonTypeNode) {}

type Path = (0 | string)[];

print([]);

interface ObjectDeclaration {
  statement: string;
}

function getDeclarations(node: JsonTypeNode, rootName?: string): ObjectDeclaration[] {
  if (!node.types.size) throw new Error("Root node is missing type");
  // check if it's all primitive

  if (!node.types.has("object") && !node.types.has("array")) return getPrimitiveDeclaration([rootName ?? "Root"], node);

  return getObjectDeclarations([rootName ?? "Root"], node);
}

function getPrimitiveDeclaration(path: Path, node: JsonTypeNode): ObjectDeclaration[] {
  return [{ statement: `type ${pathToName(path)} = ${[...node.types].join(" | ")}` }];
}

function getObjectDeclarations(path: Path, node: JsonTypeNode): ObjectDeclaration[] {
  return [];
}

// function getInlineRight(children: Declaration[]) {
//   return children.map((child) => child.typeName).join(" | ");
// }

// function getInterfaceRight(children: Declaration[]) {
//   return `{\n${children.map((child) => `  ${child.key}: ${child.typeName}`)}\n}`;
// }

function pathToName(path: (string | number)[]) {
  return `I${path
    .map(indexToItemKey)
    .map((key) => capitalizeFirstChar(key))
    .join("")}`;
}

function indexToItemKey(key: string | number): string {
  return typeof key === "string" ? key : `item`;
}

function capitalizeFirstChar(text: string): any {
  if (!text.length) return text;
  return text[0].toUpperCase() + text.slice(1);
}

function print(data: any) {
  const jsonTypeNode = getJsonTypeTree(data);
  const declarations = getDeclarations(jsonTypeNode);

  console.log(declarations.map((d) => d.statement).join("\n\n"));
}
