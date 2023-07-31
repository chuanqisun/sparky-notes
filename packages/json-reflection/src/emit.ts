import { type TypeNode } from "./parse";

export interface EmitConfig {
  rootName: string;
  interfacePrefix: string;
}

/**
 * Future improvements:
 * 1. Deduplicate declarations for different fields
 * 2. Customize {} and [] types
 * 3. Customize export: none|root|all
 * 4. Customize type vs interface
 * 5. Customize semicolon
 */

export function emit(node: TypeNode, config: EmitConfig): string {
  if (!node.types.size) throw new Error("Root node is missing type");

  const { rootName, interfacePrefix } = config;
  const pathNameGenerator = memoize(getPathNameGenerator(new Set()));

  const { declarations } = getIdentifiers([rootName], node, { isRoot: true, interfacePrefix, pathNameGenerator });

  return declarations.join("\n\n");
}

type Path = (0 | string)[];
interface GetIdentifiersConfig {
  isRoot?: boolean;
  pathNameGenerator: (path: Path, prefix?: string) => string;
  interfacePrefix: string;
}

/**
 * Get identifiers and dependencies declarations
 *
 * A rough grammar (might contain bugs):
 *
 * Identifier ::= Primitives | Arrays | EmptyObjects | Unions
 * Unions: Identifier ("|" Identifier)*
 * GroupedUnions: "("Unions")"
 * Primitives ::= "string" | "number" | "boolean" | "null" | "undefined"
 * Arrays ::= Primitives"[]" | Arrays"[]" | EmptyObject"[]" | GroupedUnions"[]"
 * EmptyObject ::= "{}" | "[]"
 */
function getIdentifiers(path: Path, node: TypeNode, config: GetIdentifiersConfig): { identifiers: string[]; declarations: string[] } {
  const identifiers = [...node.types].filter(isPrimitive);
  const declarations: string[] = [];
  const keyedChildren = [...(node.children?.entries() ?? [])].filter(([key]) => typeof key === "string");
  const indexedChildren = [...(node.children?.entries() ?? [])].filter(([key]) => typeof key === "number");
  const hasEmptyArray = node.types.has("array") && !indexedChildren.length;
  const hasObject = node.types.has("object");
  const hasEmptyObject = hasObject && !keyedChildren.length;
  const { isRoot, ...childConfig } = config;

  const { indexedChildIndentifiers, indexedChildDeclarations } = indexedChildren.reduce(
    (result, item) => {
      const [key, childNode] = item;
      const childPath = [...path, key];
      const { identifiers, declarations } = getIdentifiers(childPath, childNode, childConfig);

      result.indexedChildIndentifiers.push(`${groupedUnion(identifiers)}[]`);
      result.indexedChildDeclarations.push(...declarations);

      return result;
    },
    {
      indexedChildIndentifiers: [] as string[],
      indexedChildDeclarations: [] as string[],
    }
  );

  if (hasEmptyObject) identifiers.push("Record<string, any>");
  if (hasEmptyArray) identifiers.push("any[]");

  identifiers.push(...indexedChildIndentifiers);
  declarations.push(...indexedChildDeclarations);

  const { keyedChildEntries, keyedChildDeclarations } = keyedChildren.reduce(
    (result, item) => {
      const [key, childNode] = item;
      const childPath = [...path, key];
      const { identifiers, declarations } = getIdentifiers(childPath, childNode, childConfig);
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

  if (keyedChildEntries.length) {
    // render objects as identifer + declaration
    const objectLiteral = `{\n${keyedChildEntries.map(([k, v]) => `  ${renderKey(k)}${node.requiredKeys?.has(k) ? "" : "?"}: ${v};`).join("\n")}\n}`;

    const declaration = renderDeclaration({
      lValue: config.pathNameGenerator(path, config.interfacePrefix),
      rValue: renderIdentifiers([objectLiteral]),
      isInterface: true,
    });

    identifiers.push(config.pathNameGenerator(path, config.interfacePrefix));
    declarations.unshift(declaration);
  } else if (identifiers.length > 0 && isRoot) {
    // Root needs to collect and render any identifiers from any child level
    // HACK: render interface if and only if identifer is a single object
    const isInterface = identifiers.length === 1 && identifiers[0].startsWith("{");
    const declaration = renderDeclaration({
      lValue: config.pathNameGenerator(path, isInterface ? config.interfacePrefix : ""),
      rValue: renderIdentifiers(identifiers),
      isInterface,
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

function renderKey(key: string): string {
  if (isJsIdentifier(key)) return key;

  const stringifedKey = JSON.stringify(key);
  return stringifedKey;
}

function isJsIdentifier(text: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(text);
}

function toAlphaNumericParts(text: string): string[] {
  const chunks = text
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ");
  return chunks;
}

function isPrimitive(type: string) {
  return type !== "object" && type !== "array";
}

function getPathNameGenerator(usedNames: Set<string>) {
  return (path: (string | 0)[], prefix?: string) => {
    const name = pathToName(path, prefix);
    if (usedNames.has(name)) {
      let i = 2;
      while (usedNames.has(`${name}${i}`)) {
        i++;
      }
      usedNames.add(`${name}${i}`);
      return `${name}${i}`;
    } else {
      usedNames.add(name);
      return name;
    }
  };
}

function pathToName(path: (string | 0)[], prefix?: string) {
  return `${prefix ?? ""}${path.map(indexToItemKey).join("")}`;
}

function indexToItemKey(key: string | number): string {
  if (typeof key === "string") {
    const normalizedKey = toAlphaNumericParts(key)
      .map((part) => capitalizeFirstChar(part))
      .join("");

    if (!normalizedKey) return "Field";
    return normalizedKey;
  } else {
    return "Item";
  }
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

/**
 * Wrap the inner function. Call once and return its result for all subsequent calls until the args have changed
 */
function memoize<T extends any[], R>(fn: (...args: T) => R) {
  let lastArgs: T | undefined;
  let lastResult: R | undefined;
  return (...args: T): R => {
    if (lastArgs && args.every((arg, i) => arg === lastArgs![i])) {
      return lastResult!;
    }
    lastArgs = args;
    lastResult = fn(...args);
    return lastResult;
  };
}
