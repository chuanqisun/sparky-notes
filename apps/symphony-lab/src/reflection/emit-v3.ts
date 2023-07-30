import assert from "node:assert";
import { getJsonTypeTree, type JsonTypeNode } from "./get-json-type-tree";

type Path = (0 | string)[];
assertEmitter(1, `type IRoot = number;`);
assertEmitter({}, `type IRoot = any;`);
assertEmitter([], `type IRoot = any[];`);
assertEmitter([1], `type IRoot = number[];`);
assertEmitter([1, true, "string"], `type IRoot = (number | boolean | string)[];`);

assertEmitter(
  { a: 1 },
  `
interface IRoot {
  a: number;
}`
);

assertEmitter(
  { a: { x: 1 } },
  `
interface IRoot {
  a: IRootA;
}

interface IRootA {
  x: number;
}
`
);
assertEmitter(
  [{ a: [{}, {}, {}] }],
  `
type IRoot = IRootItem[];

interface IRootItem {
  a: any[];
}
`
);
assertEmitter([[], [], []], `type IRoot = any[][];`);
assertEmitter(
  [{ a: 1 }, {}, {}],
  `
type IRoot = IRootItem[];

interface IRootItem {
  a?: number;
}`
);

// TODO: escape identifiers
// TODO: escape type names
function getDeclarations(node: JsonTypeNode, rootName?: string): string {
  if (!node.types.size) throw new Error("Root node is missing type");
  const path = [rootName ?? "Root"];
  const { declarations } = getIdentifiers(path, node, { declarePrimitive: true, inlineObject: true });
  return declarations.join("\n\n");
}

interface GetIdentifiersConfig {
  declarePrimitive?: boolean;
  inlineObject?: boolean;
}
function getIdentifiers(path: Path, node: JsonTypeNode, config?: GetIdentifiersConfig): { identifiers: string[]; declarations: string[] } {
  // identifiers are primitives, arrays, or empty objects: all primitives, {}, [], and array of irreducible types
  const identifiers = [...node.types].filter(isPrimitive);
  const declarations: string[] = [];
  const keyedChildren = [...(node.children?.entries() ?? [])].filter(([key]) => typeof key === "string");
  const indexedChildren = [...(node.children?.entries() ?? [])].filter(([key]) => typeof key === "number");
  const hasEmptyArray = node.types.has("array") && !indexedChildren.length;
  const hasEmptyObject = node.types.has("object") && !keyedChildren.length;

  const { indexedChildIndentifiers, indexedChildDeclarations } = indexedChildren.reduce(
    (result, item) => {
      const [key, childNode] = item;
      const childPath = [...path, key];
      const { identifiers, declarations } = getIdentifiers(childPath, childNode);

      result.indexedChildIndentifiers.push(`${groupedUnion(identifiers)}[]`);
      result.indexedChildDeclarations.push(...declarations);

      return result;
    },
    {
      indexedChildIndentifiers: [] as string[],
      indexedChildDeclarations: [] as string[],
    }
  );
  if (hasEmptyArray) identifiers.push("any[]");
  identifiers.push(...indexedChildIndentifiers);
  declarations.push(...indexedChildDeclarations);

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
  declarations.push(...keyedChildDeclarations);

  if (hasEmptyObject || keyedChildEntries.length) {
    const keyedChildIdentifiers = hasEmptyObject
      ? "any"
      : `{\n${keyedChildEntries.map(([k, v]) => `  ${k}${node.requiredKeys?.has(k) ? "" : "?"}: ${v};`).join("\n")}\n}`;
    if (hasEmptyObject || config?.inlineObject) {
      identifiers.push(keyedChildIdentifiers);
    } else {
      identifiers.push(pathToName(path));
      const declaration = renderDeclaration({
        lValue: pathToName(path),
        rValue: renderIdentifiers([keyedChildIdentifiers]),
        isInterface: true,
      });

      declarations.unshift(declaration);
    }
  }

  if (identifiers.length > 0 && config?.declarePrimitive) {
    const declaration = renderDeclaration({
      lValue: pathToName(path),
      rValue: renderIdentifiers(identifiers),
      // HACK: render interface if and only if identifer is a single object
      isInterface: identifiers.length === 1 && identifiers[0].startsWith("{"),
    });

    declarations.unshift(declaration);
  }

  return {
    identifiers,
    declarations,
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
=== Input ===
${JSON.stringify(input, null, 2)}

=== Expected ===
${expected.trim()}

=== Actual ===
${declarations}`);
  }
}
