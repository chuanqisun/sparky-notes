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
type IRoot = {
  a: number;
};`
);

function getDeclarations(node: JsonTypeNode, rootName?: string): string {
  if (!node.types.size) throw new Error("Root node is missing type");
  return getObjectDeclarations([rootName ?? "Root"], node).join("\n\n");
}

function getObjectDeclarations(path: Path, node: JsonTypeNode): string[] {
  const { identifiers, declarations } = getIdentifiers(path, node);
  const primaryDeclaration = renderDeclaration({
    lValue: pathToName(path),
    rValue: renderIdentifiers(identifiers),
  });

  return [primaryDeclaration, ...declarations];
}

function getIdentifiers(path: Path, node: JsonTypeNode): { identifiers: string[]; declarations: string[] } {
  const irreducibles = [...node.types].filter(isPrimitive);
  const keyedChildren = [...(node.children?.entries() ?? [])].filter(([key]) => typeof key === "string");
  const indexedChildren = [...(node.children?.entries() ?? [])].filter(([key]) => typeof key === "number");
  const hasArray = node.types.has("array");
  const hasObject = node.types.has("object");

  // irreducible types: all primitives, {}, [], and array of irreducible types

  // move empty {} and [] to primitives
  if (hasObject && !keyedChildren.length) {
    irreducibles.push("any");
  }

  if (hasArray && !indexedChildren.length) {
    irreducibles.push("any[]");
  }

  const indexedChildIdentifiers = indexedChildren.map(([key, childNode]) => {
    const childPath = [...path, key];
    const { identifiers, declarations } = getIdentifiers(childPath, childNode);
    return {
      identifiers: identifiers.map((identifier) => `${identifier}[]`),
      declarations,
    };
  });

  // recursively get children inline types
  const keyedChildIdentifiers = keyedChildren.map(([key, childNode]) => {
    const childPath = [...path, key];
    return getIdentifiers(childPath, childNode);
  });

  // TODO keyed children and reducible arrays lead to declarations
  const declarations: string[] = [];

  const childIrreducibles = [...indexedChildIdentifiers, ...keyedChildIdentifiers].flatMap((child) => child.identifiers);
  const childDeclarations = [...indexedChildIdentifiers, ...keyedChildIdentifiers].flatMap((child) => child.declarations);

  return {
    identifiers: [...irreducibles, ...childIrreducibles],
    declarations: [...declarations, ...childDeclarations],
  };
}

interface DeclarationConfig {
  lValue: string;
  rValue: string;
  isInterface?: boolean;
}
function renderDeclaration(config: DeclarationConfig): string {
  return config.isInterface ? `interface ${config.lValue} ${config.rValue}` : `type ${config.lValue} = ${config.rValue};`;
}

function renderIdentifiers(types: string[]): string {
  return inlineUnion(types);
}

function isPrimitive(type: string) {
  return type !== "object" && type !== "array";
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

function assertEmitter(input: any, expected: string) {
  const jsonTypeNode = getJsonTypeTree(input);
  const declarations = getDeclarations(jsonTypeNode);

  try {
    assert.deepEqual(declarations.trim(), expected.trim());
  } catch (error) {
    console.error((error as any).name);
    console.log(`
=== Expected ===
${expected.trim()}

=== Actual ===
${declarations}`);
  }
}
