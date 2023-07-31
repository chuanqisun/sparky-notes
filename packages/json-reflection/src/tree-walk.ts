export type JsonTreePath = (string | number)[];
export type JsonLeafNode = { value: any; path: JsonTreePath };

export interface TreeWalkEvent {
  eventType: "openObject" | "closeObject" | "visitLeaf";
  key: string | number;
  value: any;
  /** `null`, `array`, `object`, `number`, `string`, `boolean` */
  valueType: string;
}

export function* treeWalk(root: any, key: string | number = "root"): Generator<TreeWalkEvent> {
  const type = typeof root;
  switch (type) {
    case "object":
      if (root === null) {
        yield { eventType: "visitLeaf", key, value: null, valueType: "null" };
      } else if (Array.isArray(root)) {
        yield { eventType: "openObject", key, value: root, valueType: "array" };
        for (let i = 0; i < root.length; i++) {
          yield* treeWalk(root[i], i);
        }
        yield { eventType: "closeObject", key, value: root, valueType: "array" };
      } else {
        yield { eventType: "openObject", key, value: root, valueType: "object" };
        for (const [key, value] of Object.entries(root)) {
          yield* treeWalk(value, key);
        }
        yield { eventType: "closeObject", key, value: root, valueType: "object" };
      }
      break;
    default:
      yield { eventType: "visitLeaf", key, value: root, valueType: type };
  }
}

export interface TreeWalkNode {
  path: (string | number)[];
  value?: any; // only on leaf node
}
