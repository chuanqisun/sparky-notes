import assert from "node:assert";
import { getJsonTypeTree, type JsonTypeNode } from "./get-json-type-tree";

type Path = (0 | string)[];

assertEmitter(1, `type IRoot = number;`);
assertEmitter({}, `type IRoot = any;`);
assertEmitter([], `type IRoot = any[];`);
assertEmitter([1], `type IRoot = number[];`);
assertEmitter(
  { a: 1 },
  `
interface IRoot {
  a: number;
}
`
);
assertEmitter(
  [{ a: [{}, {}, {}] }],
  `
type IRoot = IRootItem[];

interface IRootItem {
  a: IRootItemA;
}

type IRootItemA = IRootItemAItem[];

type IRootItemAItem = any;
`
);
assertEmitter(
  [[], [], []],
  `
type IRoot = IRootItem[];

type IRootItem = any[];`
);
assertEmitter(
  [{ a: 1 }, {}, {}],
  `
type IRoot = IRootItem[];

interface IRootItem {
  a?: number;
}`
);

function assertEmitter(input: any, expected: string) {
  const jsonTypeNode = getJsonTypeTree(input);
  const declarations = getDeclarations(jsonTypeNode);

  try {
    assert.deepEqual(declarations.trim(), expected.trim());
  } catch (error) {
    console.error((error as any).name);
    console.log(`
=== Expected ===
${expected}

=== Actual ===
${declarations}`);
  }
}

function getDeclarations(node: JsonTypeNode, rootName?: string): string {
  if (!node.types.size) throw new Error("Root node is missing type");
  return getObjectDeclarations([rootName ?? "Root"], node).join("\n\n");
}

function getObjectDeclarations(path: Path, node: JsonTypeNode): string[] {
  const { useInterface, inlineTypes, referencedNodes } = renderTypes(path, node);

  const self = [useInterface ? `interface ${pathToName(path)} ${inlineTypes.at(0)}` : `type ${pathToName(path)} = ${inlineTypes.join(" | ")};`];
  const dependencies = referencedNodes.flatMap(({ path, node }) => getObjectDeclarations(path, node));

  return [...self, ...dependencies];
}

interface LocatedNode {
  path: Path;
  node: JsonTypeNode;
}

// TODO
// recursive hoisting non-object types
// Do not expand object when it's part of a union
// handle "item" keyword collision
// Escaped items cannot be type names

function renderTypes(path: Path, node: JsonTypeNode): { useInterface?: boolean; inlineTypes: string[]; referencedNodes: LocatedNode[] } {
  const types = [...node.types].filter((type) => type !== "object" && type !== "array");

  const referencedNodes: LocatedNode[] = [];
  let useInterface = false;

  if (node.types.has("array")) {
    const indexedChild = node.children?.get(0);
    const indexedChildType = indexedChild ? renderItemShallow([...path, 0], indexedChild) : undefined;
    types.push(`${groupedUnion(indexedChildType?.inlineTypes ?? ["any"])}[]`);
    referencedNodes.push(...(indexedChildType?.referencedNodes ?? []));
  }

  // TODO expand object only if there are no other union types
  if (node.types.has("object")) {
    const interfaceRows: [key: string, value: string, optional?: boolean][] = [];
    const childEntries = [...(node.children?.entries() ?? [])].filter(([key]) => typeof key === "string") as [string, JsonTypeNode][];
    childEntries.forEach(([key, child]) => {
      const keyedChildType = renderItemShallow([...path, key], child);
      const definedTypes = keyedChildType.inlineTypes.filter((type) => type !== "undefined");
      const optional = !node.requiredKeys?.has(key);
      interfaceRows.push([key, inlineUnion(definedTypes), optional]);
      referencedNodes.push(...(keyedChildType.referencedNodes ?? []));
    });

    types.push(
      interfaceRows.length
        ? `{\n${interfaceRows.map(([key, value, optional]) => `  ${escapeIdentifier(key)}${optional ? "?" : ""}: ${value};`).join("\n")}\n}`
        : `any`
    );
    if (types.length === 1 && interfaceRows.length) useInterface = true;
  }

  return { useInterface, inlineTypes: types, referencedNodes };
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

  console.log(declarations);
}

function groupedUnion(items: string[]): string {
  return items.length > 1 ? `(${items.join(" | ")})` : items[0];
}
function inlineUnion(items: string[]): string {
  return items.join(" | ");
}

function escapeIdentifier(key: string): string {
  const stringifedKey = JSON.stringify(key);
  const unquotedStringiedKey = stringifedKey.slice(1, -1);
  const isEscaped = unquotedStringiedKey.length !== key.length || key.length !== key.trim().length;

  return isEscaped ? stringifedKey : key;
}
