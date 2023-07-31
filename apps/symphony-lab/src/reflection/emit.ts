import { type TypeNode } from "./parse";

export interface EmitConfig {
  /** @default "Root" */
  rootName?: string;
  /** @default "I" */
  interfacePrefix?: string;
}

/**
 * Future improvements:
 * 1. When there is `any` in the union, remove all other types and declarations
 * 2. Deduplicate declarations for different fields
 */

export function emit(node: TypeNode, config?: EmitConfig): string {
  if (!node.types.size) throw new Error("Root node is missing type");

  const { rootName, interfacePrefix } = { rootName: "Root", interfacePrefix: "I", ...config };
  const { declarations } = getIdentifiers([rootName], node, { declarePrimitive: true, inlineObject: true, interfacePrefix });

  return declarations.join("\n\n");
}

type Path = (0 | string)[];
interface GetIdentifiersConfig {
  declarePrimitive?: boolean;
  inlineObject?: boolean;
  pathNameGenerator?: (path: Path, prefix?: string) => string;
  rootPrefix?: string;
  interfacePrefix?: string;
}
function getIdentifiers(path: Path, node: TypeNode, config?: GetIdentifiersConfig): { identifiers: string[]; declarations: string[] } {
  // identifiers are primitives, arrays, or empty objects: all primitives, {}, [], and array of irreducible types
  const pathNameGenerator = memoize(config?.pathNameGenerator ?? getPathNameGenerator(new Set()));
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
      const { identifiers, declarations } = getIdentifiers(childPath, childNode, { pathNameGenerator });

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
      const { identifiers, declarations } = getIdentifiers(childPath, childNode, { pathNameGenerator });
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
      : `{\n${keyedChildEntries.map(([k, v]) => `  ${renderKey(k)}${node.requiredKeys?.has(k) ? "" : "?"}: ${v};`).join("\n")}\n}`;
    if (hasEmptyObject || config?.inlineObject) {
      identifiers.push(keyedChildIdentifiers);
    } else {
      identifiers.push(pathNameGenerator(path, "I"));
      const declaration = renderDeclaration({
        lValue: pathNameGenerator(path, "I"),
        rValue: renderIdentifiers([keyedChildIdentifiers]),
        isInterface: true,
      });

      declarations.unshift(declaration);
    }
  }

  if (identifiers.length > 0 && config?.declarePrimitive) {
    // HACK: render interface if and only if identifer is a single object
    const isInterface = identifiers.length === 1 && identifiers[0].startsWith("{");
    const declaration = renderDeclaration({
      lValue: pathNameGenerator(path, isInterface ? "I" : ""),
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
export function renderDeclaration(config: DeclarationConfig): string {
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

export function pathToName(path: (string | 0)[], prefix?: string) {
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
 * Wrapper the inner function. Call once and return its result for all subsequent calls until the args have changed
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
