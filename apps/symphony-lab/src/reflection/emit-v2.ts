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
print([
  { name: "tom", age: 32, tags: ["cool", "bad"] },
  { name: "", age: null, tags: [] },
  { name: "", tags: "best" },
]);

interface ObjectDeclaration {
  statement: string;
}

function getDeclarations(node: JsonTypeNode, rootName?: string): ObjectDeclaration[] {
  if (!node.types.size) throw new Error("Root node is missing type");
  return getObjectDeclarations([rootName ?? "Root"], node);
}

function getObjectDeclarations(path: Path, node: JsonTypeNode): ObjectDeclaration[] {
  const { inlineTypes, referencedNodes } = renderTypes(path, node);

  const self = [{ statement: `type ${pathToName(path)} = ${inlineTypes.join(" | ")}` }];
  const dependencies = referencedNodes.flatMap(({ path, node }) => getObjectDeclarations(path, node));

  return [...self, ...dependencies];
}

interface LocatedNode {
  path: Path;
  node: JsonTypeNode;
}

// FIXME recursive hoisting non-object types

function renderTypes(path: Path, node: JsonTypeNode): { inlineTypes: string[]; referencedNodes: LocatedNode[] } {
  const types = [...node.types].filter((type) => type !== "object" && type !== "array");

  const referencedNodes: LocatedNode[] = [];

  if (node.types.has("array")) {
    const indexedChild = node.children?.get(0);
    const indexedChildType = indexedChild ? renderItemShallow([...path, 0], indexedChild) : undefined;
    types.push(`${groupedUnion(indexedChildType?.inlineTypes ?? ["any"])}[]`);
    referencedNodes.push(...(indexedChildType?.referencedNodes ?? []));
  }

  // TODO expand object only if there are no other union types
  if (node.types.has("object")) {
    const interfaceRows: [key: string, value: string][] = [];
    const childEntries = [...(node.children?.entries() ?? [])].filter(([key]) => typeof key === "string") as [string, JsonTypeNode][];
    childEntries.forEach(([key, child]) => {
      const keyedChildType = renderItemShallow([...path, key], child);
      interfaceRows.push([key, inlineUnion(keyedChildType.inlineTypes)]);
      referencedNodes.push(...(keyedChildType.referencedNodes ?? []));
    });

    types.push(interfaceRows.length ? `{\n${interfaceRows.map(([key, value]) => `  ${key}: ${value}`).join("\n")}\n}` : `any`);
  }

  return { inlineTypes: types, referencedNodes };
}

function renderItemShallow(path: Path, node: JsonTypeNode): { inlineTypes: string[]; referencedNodes?: LocatedNode[] } {
  const inlineTypes = [...node.types].filter((type) => type !== "object" && type !== "array");
  const referencedNodes: LocatedNode[] = [];

  if (node.types.has("object") || node.types.has("array")) {
    inlineTypes.push(pathToName(path));
    const typesWithoutPrimitive = new Set([...node.types].filter((type) => type === "object" || type === "array"));
    const nonPrimitiveNode = { ...node, types: typesWithoutPrimitive };

    referencedNodes.push({ path, node: nonPrimitiveNode });
  }

  return { inlineTypes, referencedNodes };
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

function groupedUnion(items: string[]): string {
  return items.length > 1 ? `(${items.join(" | ")})` : items[0];
}
function inlineUnion(items: string[]): string {
  return items.join(" | ");
}
