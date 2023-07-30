import { getJsonTypeTree, type JsonTypeNode } from "./get-json-type-tree";

export function jsonTypeToTypescript(jsonNode: JsonTypeNode) {}

type Path = (0 | string)[];

console.log("---");
print(1);
console.log("---");
print({});
console.log("---");
print([]);
console.log("---");
print([1]);
console.log("---");
print({ a: 1 });
console.log("---");
print([{ a: 1 }]);

interface ObjectDeclaration {
  statement: string;
}

function getDeclarations(node: JsonTypeNode, rootName?: string): ObjectDeclaration[] {
  if (!node.types.size) throw new Error("Root node is missing type");
  return getObjectDeclarations([rootName ?? "Root"], node);
}

function getObjectDeclarations(path: Path, node: JsonTypeNode): ObjectDeclaration[] {
  const { inlineTypes, referencedNodes } = getShallowValueTypes(path, node);

  const self = [{ statement: `type ${pathToName(path)} = ${inlineTypes.join(" | ")}` }];
  const dependencies = [...(node.children?.entries() ?? [])].flatMap(([key, child]) => getObjectDeclarations([...path, key], child));

  return [...self, ...dependencies];
}

function getShallowValueTypes(path: Path, node: JsonTypeNode): { inlineTypes: string[]; referencedNodes: JsonTypeNode[] } {
  const types = [...node.types].filter((type) => type !== "object" && type !== "array");

  const indexedChild = node.children?.get(0);
  if (node.types.has("array")) types.push(indexedChild ? `${pathToName([...path, 0])}[]` : "any[]");

  const childrenKeys = [...(node.children?.keys() ?? [])].filter((key) => typeof key === "string");
  if (node.types.has("object")) {
    if (!childrenKeys.length) {
      types.push("any");
    } else if (!types.length) {
      // ok to expand
      types.push(`{\n${childrenKeys.map((key) => `  ${key}: ${pathToName([...path, key])}`)}\n}`);
    } else {
      // push the name only
      types.push(`${pathToName(path)}Object`);
    }
  }

  // TODO handle referenced nodes
  return { inlineTypes: types, referencedNodes: [] };
}

function pathToName(path: (string | 0)[]) {
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
