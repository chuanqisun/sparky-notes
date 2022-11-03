import type { MessageToUI } from "@h20/types";
import type { JSX } from "preact";
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { TreeNodeSchema, useGraph } from "./modules/graph/use-graph";
import { getHitsConfig } from "./modules/hits/config";
import { IndexedItem, useHighlight, useSearch } from "./modules/search/use-search";
import { HitsDisplayItem } from "./plugins/hits/display-item";
import { HitsGraphNode, useHits } from "./plugins/hits/use-hits";
import type { WorkerEvents, WorkerRoutes } from "./routes";
import { sendMessage } from "./utils/figma-rpc";
import { WorkerClient } from "./utils/worker-rpc";

import WebWorker from "./worker?worker";

// remove loading placeholder
document.getElementById("app")!.innerHTML = "";
window.focus();

const worker = new WorkerClient<WorkerRoutes, WorkerEvents>(new WebWorker()).start();

function App(props: { worker: WorkerClient<WorkerRoutes, WorkerEvents> }) {
  const sendToMain = useCallback(sendMessage.bind(null, import.meta.env.VITE_IFRAME_HOST_ORIGIN, import.meta.env.VITE_PLUGIN_ID), []);

  const { worker } = props;

  const hits = useHits();
  const graph = useGraph();
  const search = useSearch();

  useEffect(() => worker.subscribe("syncProgress", console.log), []);

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
      sendToMain({ requestClose: true });
    }
  }, []);

  const [query, setQuery] = useState("");
  const [searchResultTree, setResultTree] = useState<TreeNodeSchema[]>([]);

  const syncIncremental = useCallback(() => {
    graph
      .mostRecentTimestamp()
      .then((baseTimestamp) => {
        console.log("Latest timestamp", baseTimestamp);
        return baseTimestamp;
      })
      .then((baseTimestamp) => hits.pull(baseTimestamp))
      .then((changeset) => {
        console.log(`[sync] success`, changeset);
        return graph.put(changeset.add);
      });
  }, [graph.mostRecentTimestamp, hits.config]);

  const syncV2 = useCallback(async () => {
    const config = getHitsConfig();
    const result = await worker.request("sync", { config });
    console.log("Sync result", result);
  }, []);

  // auto sync on start
  useEffect(() => {
    syncIncremental();
  }, [hits.config]);

  // auto index on graph change
  useEffect(() => {
    graph.dump().then((dumpResult) => {
      const searchItems: IndexedItem[] = dumpResult.nodes.map((node) => ({
        ...node,
        fuzzyTokens: hits.toSearchItem(node as any).keywords,
      }));
      search.add(searchItems);
    });
  }, [graph.dump, hits.toSearchItem]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed.length) {
      setResultTree([]);
      return;
    }

    worker.request("search", { query }).then((res) => console.log("fts result", res));

    search.query(query).then(async (results) => {
      const ids = results.flatMap((result) => result.result) as string[];
      const priorityTree = await graph.getPriorityTree(ids);
      const list = [...priorityTree];
      setResultTree(list);
    });
  }, [query, graph.getPriorityTree, setResultTree, search.query]);

  useEffect(() => {
    document.querySelector<HTMLInputElement>(`input[type="search"]`)?.focus();
  }, []);

  const [isImporting, setIsImporting] = useState(false);

  const handlePaste = useCallback(
    async (e: JSX.TargetedClipboardEvent<HTMLInputElement>) => {
      try {
        const url = new URL(e.clipboardData?.getData("text/plain") ?? "");

        const parsedFilters = Object.fromEntries(
          [...url.searchParams.entries()]
            .filter(([key, value]) => ["researcherIds", "productIds", "groupIds", "topicIds", "methodIds", "entityTypes"].includes(key))
            .map(([key, value]) => [key, JSON.parse(value)])
        );

        sendToMain({
          importResult: {
            isInProgress: true,
          },
        });

        console.log(parsedFilters);
        hits.updateConfig({ ...hits.config, queries: [parsedFilters] });
        await graph.clearAll();
        await hits.pull();

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
            isError: true,
          },
        });
      }
    },
    [hits.updateConfig, graph.clearAll, hits.pull]
  );

  const { getHighlightHtml } = useHighlight(query);

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
                Sync v1
              </button>
              <button class="c-command-bar--btn" onClick={syncV2}>
                Sync v2
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
              {searchResultTree.map((parentNode) => (
                <HitsDisplayItem node={parentNode as HitsGraphNode} sendToFigma={sendToMain} getHighlightHtml={getHighlightHtml} />
              ))}
            </ul>
          </section>
        }
      </main>
    </>
  );
}

render(<App worker={worker} />, document.getElementById("app") as HTMLElement);
