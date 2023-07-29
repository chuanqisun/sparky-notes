import assert from "node:assert/strict";
import { jsonTreeWalk } from "../tree-walk";

assert.deepEqual([...jsonTreeWalk(undefined)], [{ eventType: "visitLeaf", key: "root", value: undefined, valueType: "undefined" }]);
assert.deepEqual([...jsonTreeWalk(null)], [{ eventType: "visitLeaf", key: "root", value: null, valueType: "null" }]);
assert.deepEqual([...jsonTreeWalk(0)], [{ eventType: "visitLeaf", key: "root", value: 0, valueType: "number" }]);
assert.deepEqual([...jsonTreeWalk("test")], [{ eventType: "visitLeaf", key: "root", value: "test", valueType: "string" }]);

assert.deepEqual(
  [...jsonTreeWalk({})],
  [
    { eventType: "openObject", key: "root", value: {}, valueType: "object" },
    { eventType: "closeObject", key: "root", value: {}, valueType: "object" },
  ]
);
assert.deepEqual(
  [...jsonTreeWalk([])],
  [
    { eventType: "openObject", key: "root", value: [], valueType: "array" },
    { eventType: "closeObject", key: "root", value: [], valueType: "array" },
  ]
);

assert.deepEqual(
  [...jsonTreeWalk({ a: 1, b: "" })],
  [
    { eventType: "openObject", key: "root", value: { a: 1, b: "" }, valueType: "object" },
    { eventType: "visitLeaf", key: "a", value: 1, valueType: "number" },
    { eventType: "visitLeaf", key: "b", value: "", valueType: "string" },
    { eventType: "closeObject", key: "root", value: { a: 1, b: "" }, valueType: "object" },
  ]
);

assert.deepEqual(
  [...jsonTreeWalk([1, ""])],
  [
    { eventType: "openObject", key: "root", value: [1, ""], valueType: "array" },
    { eventType: "visitLeaf", key: 0, value: 1, valueType: "number" },
    { eventType: "visitLeaf", key: 1, value: "", valueType: "string" },
    { eventType: "closeObject", key: "root", value: [1, ""], valueType: "array" },
  ]
);
