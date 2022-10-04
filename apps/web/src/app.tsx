import type { MessageToUI } from "@h20/types";
import type { JSX } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { useGraph } from "./modules/graph/use-graph";
import type { DisplayItem } from "./modules/kernel/kernel";
import { IndexedItem, useSearch } from "./modules/search/use-search";
import { useHits } from "./plugins/hits/use-hits";
import { sendMessage } from "./utils/ipc";
import type { Keyed } from "./utils/types";

export function App() {
  const sendToMain = useCallback(sendMessage.bind(null, import.meta.env.VITE_IFRAME_HOST_ORIGIN, import.meta.env.VITE_PLUGIN_ID), []);

  const hitsPlugin = useHits();
  const plugins = [hitsPlugin];
  const pluginMap = Object.fromEntries(plugins.map((plugin) => [plugin.id, plugin]));

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

  const [query, setQuery] = useState("");
  const [searchResultItems, setResults] = useState<Keyed<DisplayItem>[]>([]);

  // auto sync
  useEffect(() => {
    hitsPlugin.pull([]).then(async (changeset) => {
      console.log(`[sync] success`, changeset);
      return graph.put(changeset.add);
    });
  }, [hitsPlugin.config]);

  // auto index on graph change
  useEffect(() => {
    graph.dump().then((dumpResult) => {
      const searchItems: IndexedItem[] = dumpResult.nodes.map((node) => ({
        ...node,
        fuzzyTokens: pluginMap[node.pluginId].toSearchItem(node.data).keywords,
      }));
      search.add(searchItems);
      console.log(`[search] indexed`, searchItems);
    });
  }, [graph.dump]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed.length) {
      setResults([]);
      return;
    }
    search
      .query(query)
      .then((results) => {
        const ids = results.flatMap((result) => result.result) as string[];

        return graph.get(ids);
      })
      .then((nodes) => {
        setResults(
          nodes
            .filter((node) => !!node)
            .map((node) => ({
              key: node!.id,
              ...pluginMap[node!.pluginId].toDisplayItem(node!.data),
            }))
        );
      });
  }, [query, search.query, graph.get]);

  useEffect(() => {
    document.querySelector<HTMLInputElement>(`input[type="search"]`)?.focus();
  }, []);

  const [isImporting, setIsImporting] = useState(false);

  const handlePaste = (e: JSX.TargetedClipboardEvent<HTMLInputElement>) => {
    try {
      const url = new URL(e.clipboardData?.getData("text/plain") ?? "");

      const parsedFilters = Object.fromEntries(
        [...url.searchParams.entries()]
          .filter(([key, value]) => ["researcherIds", "productIds", "groupIds", "topicIds", "methodIds"].includes(key))
          .map(([key, value]) => [key, JSON.parse(value)])
      );
      console.log(parsedFilters);
      hitsPlugin.updateConfig({ ...hitsPlugin.config, queries: [parsedFilters] });

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
          {hitsPlugin.isConnected === undefined && <div>Signing in</div>}
          {hitsPlugin.isConnected === false && (
            <button class="c-command-bar--btn" onClick={hitsPlugin.signIn}>
              Sign in
            </button>
          )}
          {hitsPlugin.isConnected && (
            <>
              <button class="c-command-bar--btn" onClick={() => setIsImporting((prev) => !prev)}>
                Import
              </button>
              <button class="c-command-bar--btn" onClick={hitsPlugin.signOut}>
                Sign out
              </button>
              <button class="c-command-bar--btn" onClick={() => hitsPlugin.pull([])}>
                Sync
              </button>
            </>
          )}
        </menu>
        {isImporting && <input class="c-import-url" type="url" placeholder="Paste HITS Search URL" onPaste={(e) => handlePaste(e)} />}
        <input class="c-search-input" type="search" placeholder="Search" spellcheck={false} value={query} onInput={(e) => setQuery((e.target as any).value)} />
      </header>
      <main class="u-scroll c-main">
        {!!searchResultItems.length && (
          <section>
            <ul class="c-list">
              {searchResultItems.map((item) => (
                <li key={item.key}>
                  <button
                    class="u-reset c-button--card c-list-item"
                    onClick={() =>
                      sendToMain({
                        addCard: {
                          title: item.title,
                          url: item.externalUrl,
                        },
                      })
                    }
                  >
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
