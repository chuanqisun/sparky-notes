import type { MessageToUI } from "@h20/types";
import { JSX, render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { HitsArticle } from "./modules/hits/article";
import { useAuth } from "./modules/hits/use-auth";
import type { WorkerEvents, WorkerRoutes } from "./routes";
import { getParentOrigin, sendMessage } from "./utils/figma-rpc";
import { useDebounce } from "./utils/use-debounce";
import { useSwitchMap } from "./utils/use-switch-map";
import { useVirtualList } from "./utils/use-virtual-list";
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

  const notifyFigma = useCallback(sendMessage.bind(null, getParentOrigin(), import.meta.env.VITE_PLUGIN_ID), []);

  const { worker } = props;
  const { isConnected, signIn, signOut, accessToken } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = useCallback(() => setIsMenuOpen((isOpen) => !isOpen), []);

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

  const handleInputChange = useCallback((event: JSX.TargetedEvent) => {
    setQuery((event.target as any).value);
    virtualListRef.current?.scrollTo({ top: 0 });
  }, []);

  // handle search V2
  const debouncedQuery = useDebounce(query.trim(), "", 250);
  const effectiveQuery = useMemo(() => {
    const trimmedQuery = query.trim();
    return trimmedQuery ? debouncedQuery : trimmedQuery;
  }, [query, debouncedQuery]);

  const keywordSearch = useCallback((query: string) => worker.request("search", { query, accessToken }), [accessToken]);
  const recentSearch = useCallback(() => worker.request("recent", { accessToken }), [accessToken]);
  const anySearch = useCallback((query?: string) => (query ? keywordSearch(query) : recentSearch()), [keywordSearch, recentSearch]);
  const { task: switchableSearch, data: searchResult, error: searchError, isLoading: isSearching } = useSwitchMap(anySearch);

  useEffect(() => void switchableSearch(effectiveQuery), [effectiveQuery, switchableSearch]);

  useEffect(() => {
    document.querySelector<HTMLInputElement>(`input[type="search"]`)?.focus();
  }, []);

  const { VirtualListItem, setVirtualListRef, virtualListRef } = useVirtualList();

  return (
    <>
      <header class="c-app-header">
        <input class="c-app-header__input c-search-input" type="search" placeholder="Search" spellcheck={false} value={query} onInput={handleInputChange} />
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
          </menu>
        )}
      </header>
      <main class="c-app-layout__main u-scroll" ref={setVirtualListRef}>
        {isConnected === undefined && <div class="c-progress-bar" />}
        {isConnected && isSearching && <div class="c-progress-bar" />}
        {isConnected === false && (
          <section class="c-welcome-mat">
            <h1 class="c-welcome-title">Welcome to HITS Assistant</h1>
            <div class="c-welcome-action-group">
              <button class="u-reset c-jumbo-button" onClick={signIn}>
                Sign in
              </button>
            </div>
          </section>
        )}
        {isConnected && searchResult && !searchError && (
          <ul class="c-list" id="js-virtual-list">
            {searchResult.nodes.map((parentNode, index) => (
              <VirtualListItem key={parentNode.id} forceVisible={index < 15} placeholderClassName="c-list__placeholder">
                <HitsArticle node={parentNode} isParent={true} sendToFigma={notifyFigma} />
              </VirtualListItem>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

render(<App worker={worker} />, document.getElementById("app") as HTMLElement);
