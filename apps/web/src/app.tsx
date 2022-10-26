import type { MessageToUI } from "@h20/types";
import type { JSX } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import type { NodeSchema } from "./modules/graph/db";
import { useGraph } from "./modules/graph/use-graph";
import { IndexedItem, useSearch } from "./modules/search/use-search";
import { HitsGraphNode, useHits } from "./plugins/hits/use-hits";
import { sendMessage } from "./utils/ipc";
import type { Keyed } from "./utils/types";

interface SearchResultTree {
  [key: string]: {
    self: Keyed<DisplayItem>;
    children: Keyed<DisplayItem>[];
  };
}

export interface DisplayItem {
  title: string;
  // iconUrl?: string;
  // thumbnailUrl?: string;
  externalUrl?: string;
  innerElement?: JSX.Element;
}

export function App() {
  const sendToMain = useCallback(sendMessage.bind(null, import.meta.env.VITE_IFRAME_HOST_ORIGIN, import.meta.env.VITE_PLUGIN_ID), []);

  const hits = useHits();
  const graph = useGraph();
  const search = useSearch();

  useEffect(() => {
    const handleMainMessage = (e: MessageEvent) => {
      const pluginMessage = e.data.pluginMessage as MessageToUI;
      console.log(`[ipc] Main -> UI`, pluginMessage);

      if (pluginMessage.reset) {
        localStorage.clear();
        location.reload();
      }
    };

    window.addEventListener("message", handleMainMessage);

    return () => window.removeEventListener("message", handleMainMessage);
  }, []);

  useEffect(() => {
    const openUrl = new URLSearchParams(location.search).get("openUrl");
    if (openUrl) {
      window.open(openUrl, "_blank");
    }
  }, []);

  const [query, setQuery] = useState("");
  const [searchResultTree, setResultTree] = useState<SearchResultTree>({});

  const toSearchResultTree = useCallback(
    async (nodes: (NodeSchema | undefined)[]) => {
      const missingNodeId = new Set();
      const partialTree = nodes.filter(Boolean).reduce((tree, node) => {
        // hack, this should be opaque to kernel
        const data = node!.data as HitsGraphNode;

        // is leaf node => append to <parentId>.children
        if (data.parent) {
          tree[`hits_${data.parent.id}`] ??= { self: undefined as any, children: [] };
          tree[`hits_${data.parent.id}`].children.push({ key: node!.id, ...hits.toDisplayItem(node!.data, query) });
          missingNodeId.add(`hits_${data.parent.id}`);
        } else {
          tree[node!.id] ??= { self: undefined as any, children: [] };
          tree[node!.id].self = { key: node!.id, ...hits.toDisplayItem(node!.data, query) };
          missingNodeId.delete(node!.id);
        }

        return tree;
      }, {} as SearchResultTree);

      const missingNodes = await graph.get([...missingNodeId] as string[]);
      const missingDisplayNodes = missingNodes.map((node) => ({ key: node!.id, ...hits.toDisplayItem(node!.data, query) }));
      const fullTree = Object.fromEntries(
        Object.entries(partialTree).map(([key, value]) => [
          key,
          { self: value.self ?? missingDisplayNodes.find((item) => item.key === key), children: value.children },
        ])
      );

      return fullTree;
    },
    [query, graph.get, hits.toDisplayItem]
  );

  // auto sync
  useEffect(() => {
    // TODO incremental sync based on timestamp
    graph
      .clearAll()
      .then(() => hits.pull())
      .then((changeset) => {
        console.log(`[sync] success`, changeset);
        return graph.put(changeset.add);
      });
  }, [hits.config]);

  // auto index on graph change
  useEffect(() => {
    graph.dump().then((dumpResult) => {
      const searchItems: IndexedItem[] = dumpResult.nodes.map((node) => ({
        ...node,
        fuzzyTokens: hits.toSearchItem(node.data).keywords,
      }));
      search.add(searchItems);
      console.log(`[search] indexed`, searchItems);
    });
  }, [graph.dump, hits.toSearchItem]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed.length) {
      setResultTree({});
      return;
    }
    search
      .query(query)
      .then((results) => {
        const ids = results.flatMap((result) => result.result) as string[];
        return graph.get(ids);
      })
      .then(async (nodes) => {
        setResultTree(await toSearchResultTree(nodes));
      });
  }, [query, setResultTree, search.query, graph.get]);

  useEffect(() => {
    document.querySelector<HTMLInputElement>(`input[type="search"]`)?.focus();
  }, []);

  const [isImporting, setIsImporting] = useState(false);

  const handlePaste = (e: JSX.TargetedClipboardEvent<HTMLInputElement>) => {
    try {
      const url = new URL(e.clipboardData?.getData("text/plain") ?? "");

      const parsedFilters = Object.fromEntries(
        [...url.searchParams.entries()]
          .filter(([key, value]) => ["researcherIds", "productIds", "groupIds", "topicIds", "methodIds", "entityTypes"].includes(key))
          .map(([key, value]) => [key, JSON.parse(value)])
      );
      console.log(parsedFilters);
      hits.updateConfig({ ...hits.config, queries: [parsedFilters] });

      setIsImporting(false);
      sendToMain({
        importResult: {
          isSuccess: true,
        },
      });

      e.preventDefault();
    } catch {
      sendToMain({
        importResult: {
          isSuccess: false,
        },
      });
    }
  };

  return (
    <>
      <header class="c-app-header">
        <menu class="c-command-bar">
          {hits.isConnected === undefined && <span class="c-command-bar--text">Signing in...</span>}
          {hits.isConnected === false && (
            <button class="c-command-bar--btn" onClick={hits.signIn}>
              Sign in
            </button>
          )}
          {hits.isConnected && (
            <>
              <button class="c-command-bar--btn" onClick={() => setIsImporting((prev) => !prev)}>
                Import
              </button>
              <button class="c-command-bar--btn" onClick={() => hits.pull()}>
                Sync
              </button>
              <button class="c-command-bar--btn" onClick={hits.signOut}>
                Sign out
              </button>
            </>
          )}
        </menu>
        {isImporting && <input class="c-import-url" type="url" placeholder="Paste HITS Search URL" onPaste={(e) => handlePaste(e)} />}
        <input class="c-search-input" type="search" placeholder="Search" spellcheck={false} value={query} onInput={(e) => setQuery((e.target as any).value)} />
      </header>
      <main class="u-scroll c-main">
        {
          <section>
            <ul class="c-list">
              {Object.values(searchResultTree).map(({ self, children }) => (
                <>
                  <li class="c-list-item-container--parent" key={self.key}>
                    <button
                      class="u-reset c-button--card c-list-item"
                      onClick={() =>
                        sendToMain({
                          addCard: {
                            title: self.title,
                            url: self.externalUrl,
                          },
                        })
                      }
                    >
                      {self.innerElement || self.title}
                    </button>
                  </li>
                  {children.length > 0 && (
                    <>
                      {children.map((child) => (
                        <li key={child.key}>
                          <button
                            class="u-reset c-button--card c-list-item"
                            onClick={() =>
                              sendToMain({
                                addCard: {
                                  title: child.title,
                                  url: child.externalUrl,
                                },
                              })
                            }
                          >
                            {child.innerElement || child.title}
                          </button>
                        </li>
                      ))}
                    </>
                  )}
                </>
              ))}
            </ul>
          </section>
        }
      </main>
    </>
  );
}
