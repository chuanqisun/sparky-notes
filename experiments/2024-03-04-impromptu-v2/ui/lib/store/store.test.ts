import assert from "node:assert";
import { describe, it } from "node:test";
import { createStore } from "./store";

describe("main", () => {
  it("create store", async () => {
    const store = createStore({
      reducers: [],
      initialState: 1,
    });

    assert.strictEqual(store.$state.value, 1);
  });

  it("disaptch action without reducer", async () => {
    const store = createStore({
      reducers: [],
      initialState: 1,
    });

    store.dispatch({ type: "test" });

    assert.strictEqual(store.$state.value, 1);
  });

  it("dispatch action with reducer", async () => {
    const store = createStore({
      reducers: [
        (state, _action) => {
          return state + 1;
        },
      ],
      initialState: 1,
    });

    store.dispatch({ type: "test" });
    assert.strictEqual(store.$state.value, 2);
  });

  it("dispatch action with selective reducers", async () => {
    const store = createStore({
      reducers: [
        (state, action) => {
          if (action.type === "test") {
            return state + 1;
          }

          return state;
        },
      ],
      initialState: 1,
    });

    store.dispatch({ type: "test" });

    assert.strictEqual(store.$state.value, 2);

    store.dispatch({ type: "other" });
    assert.strictEqual(store.$state.value, 2);
  });

  it("dispatch action with multiple reducers", async () => {
    const store = createStore({
      reducers: [
        (state, action) => {
          if (action.type === "test") {
            return state + 1;
          }

          return state;
        },
        (state, action) => {
          if (action.type === "test") {
            return state + 1;
          }

          return state;
        },
      ],
      initialState: 1,
    });

    store.dispatch({ type: "test" });

    assert.strictEqual(store.$state.value, 3);
  });
});
