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
assertEmitter(
  { a: { x: 1 } },
  `
type IRoot = {
  a: IRootA;
};

type IRootA {
  x: number;
}
`
);

function getDeclarations(node: JsonTypeNode, rootName?: string): string {
  if (!node.types.size) throw new Error("Root node is missing type");
  return getObjectDeclarations([rootName ?? "Root"], node).join("\n\n");
}

function getObjectDeclarations(path: Path, node: JsonTypeNode): string[] {
  const { declarations } = getIdentifiers(path, node);
  return declarations;
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

  const { indexedChildIndentifiers, indexedChildDeclarations } = indexedChildren.reduce(
    (result, item) => {
      const [key, childNode] = item;
      const childPath = [...path, key];
      const { identifiers, declarations } = getIdentifiers(childPath, childNode);

      result.indexedChildIndentifiers.push(...identifiers.map((identifier) => `${identifier}[]`));
      result.indexedChildDeclarations.push(...declarations);

      return result;
    },
    {
      indexedChildIndentifiers: [] as string[],
      indexedChildDeclarations: [] as string[],
    }
  );

  const { keyedChildEntries, keyedChildDeclarations } = keyedChildren.reduce(
    (result, item) => {
      const [key, childNode] = item;
      const childPath = [...path, key];
      const { identifiers, declarations } = getIdentifiers(childPath, childNode);
      result.keyedChildEntries.push([key as string, inlineUnion(identifiers)]);
      result.keyedChildDeclarations.push(...declarations);

      return result;
    },
    {
      keyedChildEntries: [] as [key: string, value: string][],
      keyedChildDeclarations: [] as string[],
    }
  );

  const keyedChildIdentifiers = keyedChildEntries.length ? [`{\n${keyedChildEntries.map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}`] : [];

  const childIrreducibles = [...indexedChildIndentifiers, ...keyedChildIdentifiers];
  const childDeclarations = [...indexedChildDeclarations, ...keyedChildDeclarations];

  // render self declaration
  const declaration = renderDeclaration({
    lValue: pathToName(path),
    rValue: renderIdentifiers([...irreducibles, ...childIrreducibles]),
  });

  return {
    identifiers: [...irreducibles, ...childIrreducibles],
    declarations: [declaration, ...childDeclarations],
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
