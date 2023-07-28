export type JsonTreePath = (string | number)[];
export type JsonLeafNode = { value: any; path: JsonTreePath };

export interface TreeWalkEvent {
  type: "openObject" | "closeObject" | "visit";
  key?: string | number; // root has no key
  value?: any; // only on visit
}

export function* jsonTreeWalk(root: any, key?: string | number): Generator<TreeWalkEvent> {
  const type = typeof root;
  switch (type) {
    case "object":
      if (root === null) {
        yield { type: "visit", key, value: null };
      } else if (Array.isArray(root)) {
        yield { type: "openObject", key };
        for (let i = 0; i < root.length; i++) {
          yield* jsonTreeWalk(root[i], i);
        }
        yield { type: "closeObject", key };
      } else {
        yield { type: "openObject", key };
        for (const [key, value] of Object.entries(root)) {
          yield { type: "visit", key };
          yield* jsonTreeWalk(value, key);
        }
        yield { type: "closeObject", key };
      }
      break;
    default:
      yield { type: "visit", key, value: root };
  }
}
