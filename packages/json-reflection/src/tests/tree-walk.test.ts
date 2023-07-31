import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { treeWalk } from "../tree-walk";

describe("treeWalk", () => {
  it("shallow walk", () => {
    assert.deepEqual([...treeWalk(undefined)], [{ eventType: "visitLeaf", key: "root", value: undefined, valueType: "undefined" }]);
    assert.deepEqual([...treeWalk(null)], [{ eventType: "visitLeaf", key: "root", value: null, valueType: "null" }]);
    assert.deepEqual([...treeWalk(0)], [{ eventType: "visitLeaf", key: "root", value: 0, valueType: "number" }]);
    assert.deepEqual([...treeWalk("test")], [{ eventType: "visitLeaf", key: "root", value: "test", valueType: "string" }]);
  });

  it("nested walk", () => {
    assert.deepEqual(
      [...treeWalk({})],
      [
        { eventType: "openObject", key: "root", value: {}, valueType: "object" },
        { eventType: "closeObject", key: "root", value: {}, valueType: "object" },
      ]
    );
    assert.deepEqual(
      [...treeWalk([])],
      [
        { eventType: "openObject", key: "root", value: [], valueType: "array" },
        { eventType: "closeObject", key: "root", value: [], valueType: "array" },
      ]
    );

    assert.deepEqual(
      [...treeWalk({ a: 1, b: "" })],
      [
        { eventType: "openObject", key: "root", value: { a: 1, b: "" }, valueType: "object" },
        { eventType: "visitLeaf", key: "a", value: 1, valueType: "number" },
        { eventType: "visitLeaf", key: "b", value: "", valueType: "string" },
        { eventType: "closeObject", key: "root", value: { a: 1, b: "" }, valueType: "object" },
      ]
    );

    assert.deepEqual(
      [...treeWalk([1, ""])],
      [
        { eventType: "openObject", key: "root", value: [1, ""], valueType: "array" },
        { eventType: "visitLeaf", key: 0, value: 1, valueType: "number" },
        { eventType: "visitLeaf", key: 1, value: "", valueType: "string" },
        { eventType: "closeObject", key: "root", value: [1, ""], valueType: "array" },
      ]
    );
  });
});
