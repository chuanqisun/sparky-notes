import type { MessageToUI } from "@h20/types";
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { HitsCard } from "./modules/hits/card";
import type { HitsGraphNode } from "./modules/hits/hits";
import { useAuth } from "./modules/hits/use-auth";
import { useConfig } from "./modules/hits/use-config";
import { useHighlight } from "./modules/search/use-search";
import { StatusBar, useLog } from "./modules/status/status-bar";
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
  // Handle URL redirect
  useEffect(() => {
    const openUrl = new URLSearchParams(location.search).get("openUrl");
    if (openUrl) {
      window.open(openUrl, "_blank");
      notifyFigma({ requestClose: true });
    }
  }, []);

  const notifyFigma = useCallback(sendMessage.bind(null, import.meta.env.VITE_IFRAME_HOST_ORIGIN, import.meta.env.VITE_PLUGIN_ID), []);
  const { log, lines } = useLog();

  const { worker } = props;
  const { isConnected, signIn, signOut } = useAuth();
  const { value: configValue } = useConfig();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = useCallback(() => setIsMenuOpen((isOpen) => !isOpen), []);
  const [installationState, setInstallationState] = useState<"installed" | "new" | "error" | "installing" | "unknown">("unknown");
  const [installProgress, setInstallProgress] = useState("Connecting");

  useEffect(() => {
    switch (isConnected) {
      case false:
        return log("Signed out");
      case true:
        return log("Signed in");
      case undefined:
        return log("Signing in...");
    }
  }, [isConnected]);

  // Handle server events
  // Caution: please keep deps array empty
  useEffect(() => {
    const subArray = [
      worker.subscribe("indexChanged", (type) => type === "built" && log(`Building index... Success`)),
      worker.subscribe("syncProgressed", (progress) => {
        if (progress.total) {
          const percentage = `${((100 * progress.success) / progress.total).toFixed(2)}%`;
          log(`Sync... ${percentage}`);
          setInstallProgress(percentage);
        }
      }),
      worker.subscribe("syncCompleted", (summary) => {
        if (summary.hasError) {
          log(`Sync... Failed. Please try again or reset the app`);
        } else {
          log(`Sync... Success! ${summary.total ? `${summary.total} items updated` : "No change"}`);
        }
      }),
      worker.subscribe("requestInstallation", () => setInstallationState("new")),
      worker.subscribe("uninstalled", () => location.reload()),
      worker.subscribe("installed", (status) => {
        setInstallationState(status === "success" ? "installed" : "error");
      }),
    ];

    return () => subArray.map((unsub) => unsub());
  }, []);

  // Figma RPC
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
  const [searchResultTree, setResultTree] = useState<HitsGraphNode[]>([]);

  // Incremental sync on start
  useEffect(() => void worker.request("incSync", { config: configValue }), []);

  const handleUninstall = useCallback(async () => {
    worker.request("uninstall");
  }, []);

  const handleInstall = useCallback(async () => {
    setInstallationState("installing");
    await worker.request("fullSync", { config: configValue });
  }, [configValue]);

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
        <input
          class="c-app-header__input c-search-input"
          type="search"
          placeholder="Search"
          spellcheck={false}
          value={query}
          onInput={(e) => setQuery((e.target as any).value)}
        />
        <button class="u-reset c-app-header__trigger c-menu-trigger-button" data-active={isMenuOpen} onClick={toggleMenu}>
          Menu
        </button>
        {isMenuOpen && (
          <menu class="c-app-header__menu c-app-menu" onClick={toggleMenu}>
            {isConnected === undefined && <span class="c-app-menu--text">Signing in...</span>}
            {isConnected === false && (
              <button class="u-reset c-app-menu--btn" onClick={signIn}>
                Sign in
              </button>
            )}
            {isConnected && (
              <>
                <button class="u-reset c-app-menu--btn" onClick={signOut}>
                  Sign out
                </button>
              </>
            )}
            <button class="u-reset c-app-menu--btn" onClick={handleUninstall}>
              Uninstall
            </button>
          </menu>
        )}
      </header>
      <main class="u-scroll c-main">
        {(installationState === "new" || installationState === "installing") && (
          <section class="c-welcome-mat">
            <h1 class="c-welcome-title">Welcome to HITS Assistant</h1>
            <div class="c-welcome-action-group">
              {installationState === "new" && (
                <button class="u-reset c-install-button" onClick={handleInstall}>
                  <span>Install</span>
                </button>
              )}
              {installationState === "installing" && (
                <button class="u-reset c-install-button" onClick={handleInstall} disabled>
                  Installing... {installProgress}
                </button>
              )}
              <small class="c-welcome-hint">(Will download about 20MB of data)</small>
            </div>
          </section>
        )}
        <ul class="c-list">
          {searchResultTree.map((parentNode) => (
            <HitsCard node={parentNode} isParent={true} sendToFigma={notifyFigma} getHighlightHtml={getHighlightHtml} />
          ))}
        </ul>
      </main>
      <footer>
        <StatusBar lines={lines} />
      </footer>
    </>
  );
}

render(<App worker={worker} />, document.getElementById("app") as HTMLElement);
