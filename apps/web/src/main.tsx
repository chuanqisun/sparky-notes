import type { MessageToUI } from "@h20/types";
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { HitsCard } from "./modules/hits/card";
import type { HitsGraphNode } from "./modules/hits/hits";
import { useAuth } from "./modules/hits/use-auth";
import { useConfig } from "./modules/hits/use-config";
import { useHighlight } from "./modules/search/use-search";
import type { WorkerEvents, WorkerRoutes } from "./routes";
import { sendMessage } from "./utils/figma-rpc";
import { WorkerClient } from "./utils/worker-rpc";
import WebWorker from "./worker?worker";

// start worker ASAP
const worker = new WorkerClient<WorkerRoutes, WorkerEvents>(new WebWorker()).start();

// remove loading placeholder
document.getElementById("app")!.innerHTML = "";
window.focus();

function App(props: { worker: WorkerClient<WorkerRoutes, WorkerEvents> }) {
  const sendToMain = useCallback(sendMessage.bind(null, import.meta.env.VITE_IFRAME_HOST_ORIGIN, import.meta.env.VITE_PLUGIN_ID), []);

  const { worker } = props;
  const { isConnected, signIn, signOut } = useAuth();
  const { value: configValue } = useConfig();

  useEffect(() => {
    worker.subscribe("indexChanged", () => {
      console.log("index changed");
    });
  }, []);

  useEffect(() => worker.subscribe("syncProgressed", console.log), []);

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
  const [searchResultTree, setResultTree] = useState<HitsGraphNode[]>([]);

  const syncV2 = useCallback(async () => {
    const result = await worker.request("fullSync", { config: configValue });
    console.log("Sync result", result);
  }, [configValue]);

  // auto sync on start
  useEffect(() => {
    // TBD
  }, []);

  // handle search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed.length) {
      setResultTree([]);
      return;
    }

    worker.request("search", { query }).then((searchResult) => {
      setResultTree(searchResult.nodes);
    });
  }, [query, setResultTree]);

  useEffect(() => {
    document.querySelector<HTMLInputElement>(`input[type="search"]`)?.focus();
  }, []);

  const { getHighlightHtml } = useHighlight(query);

  return (
    <>
      <header class="c-app-header">
        <menu class="c-command-bar">
          {isConnected === undefined && <span class="c-command-bar--text">Signing in...</span>}
          {isConnected === false && (
            <button class="c-command-bar--btn" onClick={signIn}>
              Sign in
            </button>
          )}
          {isConnected && (
            <>
              <button class="c-command-bar--btn" onClick={syncV2}>
                Sync
              </button>
              <button class="c-command-bar--btn" onClick={signOut}>
                Sign out
              </button>
            </>
          )}
        </menu>
        <input class="c-search-input" type="search" placeholder="Search" spellcheck={false} value={query} onInput={(e) => setQuery((e.target as any).value)} />
      </header>
      <main class="u-scroll c-main">
        {
          <section>
            <ul class="c-list">
              {searchResultTree.map((parentNode) => (
                <HitsCard node={parentNode} isParent={true} sendToFigma={sendToMain} getHighlightHtml={getHighlightHtml} />
              ))}
            </ul>
          </section>
        }
      </main>
    </>
  );
}

render(<App worker={worker} />, document.getElementById("app") as HTMLElement);
