import assert from "node:assert";
import { describe, it } from "node:test";
import { emit, type EmitConfig } from "../emit";
import { parse } from "../parse";

describe("emit", () => {
  it("primitives", () => {
    assertEmitter(1, `type Root = number;`);
  });

  it("empty objects", () => {
    assertEmitter({}, `type Root = Record<string, any>;`);
    assertEmitter([], `type Root = any[];`);
  });

  it("simple arrays", () => {
    assertEmitter([1], `type Root = number[];`);
    assertEmitter([1, true, "string"], `type Root = (number | boolean | string)[];`);
  });

  it("simple objects", () => {
    assertEmitter(
      { a: 1 },
      `
interface IRoot {
  a: number;
}`
    );
  });

  it("complex objects", () => {
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
type Root = IRootItem[];

interface IRootItem {
  a: Record<string, any>[];
}
`
    );
    assertEmitter([[], [], []], `type Root = any[][];`);

    assertEmitter(
      [{ a: 1 }, {}, {}],
      `
type Root = IRootItem[];

interface IRootItem {
  a?: number;
}`
    );

    assertEmitter(
      [{ a: [] }, { a: [1] }],
      `
type Root = IRootItem[];

interface IRootItem {
  a: number[];
}`
    );

    assertEmitter(
      [{ a: 1 }, ""],
      `
type Root = (string | IRootItem)[];

interface IRootItem {
  a: number;
}`
    );
  });

  it("key names", () => {
    assertEmitter(
      { "": 1, " ": 1, " test ": 1, "a b": 1, "\n": 1, '"': 1, "\\": 1, "'": 1 },
      String.raw`
interface IRoot {
  "": number;
  " ": number;
  " test ": number;
  "a b": number;
  "\n": number;
  "\"": number;
  "\\": number;
  "'": number;
}
`
    );
  });

  it("type names", () => {
    assertEmitter(
      { "": { a: 1 }, " ": { a: 1 }, " test ": { a: 1 }, "a b": { a: 1 }, "\n": { a: 1 }, '"': { a: 1 }, "\\": { a: 1 }, "'": { a: 1 } },
      String.raw`
interface IRoot {
  "": IRootField;
  " ": IRootField2;
  " test ": IRootTest;
  "a b": IRootAB;
  "\n": IRootField3;
  "\"": IRootField4;
  "\\": IRootField5;
  "'": IRootField6;
}

interface IRootField {
  a: number;
}

interface IRootField2 {
  a: number;
}

interface IRootTest {
  a: number;
}

interface IRootAB {
  a: number;
}

interface IRootField3 {
  a: number;
}

interface IRootField4 {
  a: number;
}

interface IRootField5 {
  a: number;
}

interface IRootField6 {
  a: number;
}
`
    );
  });

  it("custom root name", () => {
    assertEmitter(1, `type CustomRoot = number;`, { rootName: "CustomRoot" });

    assertEmitter(
      { a: 1 },
      `
interface ICustomRoot {
  a: number;
}`,
      {
        rootName: "CustomRoot",
      }
    );
  });

  it("empty interface prefix", () => {
    assertEmitter(
      { a: 1 },
      `
interface Root {
  a: number;
}`,
      {
        interfacePrefix: "",
      }
    );
  });

  it("custom interface prefix", () => {
    assertEmitter(
      { a: 1 },
      `
interface MyRoot {
  a: number;
}`,
      {
        interfacePrefix: "My",
      }
    );
  });

  it("custom interface prefix with root name", () => {
    assertEmitter(
      { a: 1 },
      `
interface MySpecialType {
  a: number;
}`,
      {
        interfacePrefix: "My",
        rootName: "SpecialType",
      }
    );
  });
});

function assertEmitter(input: any, expected: string, config?: EmitConfig) {
  const jsonTypeNode = parse(input);
  const declarations = emit(jsonTypeNode, config);

  try {
    assert.deepEqual(declarations.trim(), expected.trim());
  } catch (e) {
    console.log(
      `
=== Input ===
${JSON.stringify(input, null, 2)}

=== Expected ===
${expected}

=== Actual ===
${declarations}
    `.trim()
    );

    throw e;
  }
}
