import assert from "node:assert";
import { getJsonTypeTree, type JsonTypeNode } from "./get-json-type-tree";

export function emitType(typeNode: JsonTypeNode, rootName = "Root") {
  const displayTypeNode = getDisplayTypeNode(typeNode, [rootName]);

  // recursive print display nodes
  const lines: string[] = [];
  printHelper(displayTypeNode, lines);

  return lines;
}

// TODO optimizations:
// Use interface when possible
// use ? for undefined
// when in union, object type should refer to a child type
// use ; for type, omit for interface
// use the shortest path name possible

export function emitArrayItemType(typeNode: JsonTypeNode, rootName = "Item") {
  const displayTypeNode = getDisplayTypeNode(typeNode, []);
  const [itemNode] = [...displayTypeNode.indexedTypes];
  itemNode.path = [rootName];

  // recursive print display nodes
  const lines: string[] = [];
  printHelper(itemNode, lines);

  return lines;
}

assertEmitter(
  [{ a: 1 }, { b: "test" }, { a: "test" }],
  `
type IRoot = IRootItem[];

type IRootItem = {
  a: number | undefined | string;
  b: string | undefined;
};
`
);

assertArrayItemEmitter(
  [{ a: 1 }, { b: "test" }, { a: "test" }],
  `
type IItem = {
  a: number | undefined | string;
  b: string | undefined;
};
  `
);

function assertEmitter(json: any, type: string) {
  const typeNode = getJsonTypeTree(json);
  const lines = emitType(typeNode);

  assert.equal(lines.join("\n\n"), type.trim());
}

function assertArrayItemEmitter(json: any, type: string) {
  const typeNode = getJsonTypeTree(json);
  const lines = emitArrayItemType(typeNode);

  assert.equal(lines.join("\n\n"), type.trim());
}

// first print node itself, then recursively print children
// uses printDisplayTypeNode
function printHelper(node: DisplayTypeNode, lines: string[]) {
  const self = printDisplayTypeNode(node);

  // print self
  lines.push(self);

  // print referenced children type
  [...node.keyedTypes.values(), ...node.indexedTypes].filter((node) => !isShallowType(node)).forEach((child) => printHelper(child, lines));
}

interface DisplayTypeNode {
  path: (string | 0)[];
  primitiveTypes: Set<string>;
  keyedTypes: Map<string, DisplayTypeNode>;
  indexedTypes: Set<DisplayTypeNode>;
  hasObject?: boolean;
  hasArray?: boolean;
}

function getDisplayTypeNode(node: JsonTypeNode, path: (string | 0)[]): DisplayTypeNode {
  const allKeys = [...(node.children?.keys() ?? [])];

  const displayNode: DisplayTypeNode = {
    path,
    primitiveTypes: new Set([...(node.types ?? [])].filter((type) => type !== "object" && type !== "array")),
    keyedTypes: new Map(
      allKeys.filter((key): key is string => typeof key === "string").map((key) => [key, getDisplayTypeNode(node.children!.get(key)!, [...path, key])])
    ),
    indexedTypes: new Set(
      allKeys.filter((key): key is 0 => typeof key === "number").map((key) => getDisplayTypeNode(node.children!.get(key)!, [...path, key]))
    ),
  };

  displayNode.hasArray = node.types.has("array");
  displayNode.hasObject = node.types.has("object");

  return displayNode;
}

function printDisplayTypeNode(node: DisplayTypeNode): string {
  const primitives = [...node.primitiveTypes];

  let arrays: string[] = [];

  const leftHand = getInterfaceName(node.path);

  if (node.hasArray) {
    const indexedTypes = [...node.indexedTypes];
    if (indexedTypes.length === 0) {
      arrays.push(`any[]`);
    } else {
      arrays = indexedTypes.map((child) => `${getShallowTypeName(child)}[]`);
    }
  }

  let objects: string[] = [];

  if (node.hasObject) {
    if (node.keyedTypes.size === 0) {
      objects.push(`any`);
    } else {
      objects.push(`{\n${[...node.keyedTypes.entries()].map(([key, childType]) => `  ${key}: ${getShallowTypeName(childType)};`).join("\n")}\n}`);
    }
  }

  const rightHand = [...primitives, ...arrays, ...objects].join(" | ");

  return `type ${leftHand} = ${rightHand};`;
}

function getShallowTypeName(node: DisplayTypeNode): string {
  const primitiveNames = [...node.primitiveTypes];

  if (isShallowType(node)) {
    const shallowParts: string[] = [...primitiveNames, ...(node.hasArray ? ["any[]"] : []), ...(node.hasObject ? ["any"] : [])];
    return shallowParts.join(" | ");
  }

  return getInterfaceName(node.path);
}

function isShallowType(node: DisplayTypeNode): boolean {
  return node.keyedTypes.size === 0 && node.indexedTypes.size === 0;
}

function getInterfaceName(path: (string | number)[]) {
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
