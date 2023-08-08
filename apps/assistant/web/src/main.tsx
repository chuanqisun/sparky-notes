import type { CardData, MessageToUI } from "@h20/types";
import { render, type JSX } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { TOKEN_CACHE_KEY, getInitialToken, validateToken } from "./modules/account/access-token";
import { CONFIG_CACHE_KEY, getInitialConfig, validateConfig } from "./modules/account/config";
import { useAuth } from "./modules/account/use-auth";
import type { HitsDisplayNode } from "./modules/display/display-node";
import { getParentOrigin, sendMessage } from "./modules/figma/figma-rpc";
import { HitsArticle } from "./modules/hits/article";
import { ErrorMessage } from "./modules/hits/error";
import { appInsights } from "./modules/telemetry/app-insights";
import type { SearchRes, WorkerEvents, WorkerRoutes } from "./routes";
import { debounce } from "./utils/debounce";
import { getUniqueFilter } from "./utils/get-unique-filter";
import { ensureJson } from "./utils/local-storage";
import { useConcurrentTasks } from "./utils/use-concurrent-tasks";
import { useInfiniteScroll } from "./utils/use-infinite-scroll";
import { WorkerClient } from "./utils/worker-rpc";
import WebWorker from "./worker?worker";

// start worker ASAP
const worker = new WorkerClient<WorkerRoutes, WorkerEvents>(new WebWorker()).start();
const PAGE_SIZE = 20;

// remove loading placeholder
document.getElementById("app")!.innerHTML = "";
window.focus();

ensureJson(CONFIG_CACHE_KEY, validateConfig, getInitialConfig);
ensureJson(TOKEN_CACHE_KEY, validateToken, getInitialToken);

appInsights.trackPageView();

function App(props: { worker: WorkerClient<WorkerRoutes, WorkerEvents> }) {
  useEffect(() => {
    document.querySelector<HTMLInputElement>(`input[type="search"]`)?.focus();
  }, []);

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
  const { isConnected, signIn, signOut, accessToken, isTokenExpired } = useAuth();

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
  const [inputState, setInputState] = useState({ effectiveQuery: "", skip: 0 });
  const setInputStateDebounced = debounce(setInputState, 250);

  const [outputState, setOutputState] = useState({
    showTopLoadingSpinner: false,
    showBottomLoadingSpinner: false,
    showErrorMessage: false,
    shouldDetectBottom: false,
    nodes: [] as HitsDisplayNode[],
  });

  const handleInputChange = useCallback((event: JSX.TargetedEvent) => {
    setQuery((event.target as any).value);
    scrollToTop();

    const trimmedValue = (event.target as any).value.trim();
    (trimmedValue ? setInputStateDebounced : setInputState)({
      effectiveQuery: trimmedValue,
      skip: 0,
    });
  }, []);

  const keywordSearch = useCallback((top: number, skip: number, query: string) => worker.request("search", { query, accessToken, skip, top }), [accessToken]);
  const recentSearch = useCallback((top: number, skip: number) => worker.request("recent", { accessToken, skip, top }), [accessToken]);
  const anySearch = useCallback(
    (top: number, skip: number, query?: string) => (query ? keywordSearch(top, skip, query) : recentSearch(top, skip)),
    [keywordSearch, recentSearch]
  );

  // handle send card to figma
  const handleAddCard = useCallback(
    (cardData: CardData) => {
      appInsights.trackEvent({ name: "add-card" }, { entityId: cardData.entityId, entityType: cardData.entityType });
      notifyFigma({ addCard: cardData });
    },
    [notifyFigma]
  );

  const { queue, add } = useConcurrentTasks<SearchRes>();

  useEffect(() => {
    if (isTokenExpired) return;

    add({ queueKey: inputState.effectiveQuery, itemKey: `${inputState.skip}`, work: () => anySearch(PAGE_SIZE, inputState.skip, inputState.effectiveQuery) });
  }, [inputState.skip, inputState.effectiveQuery, anySearch, isTokenExpired]);

  const { isSearchPending, isLoadingMore, isSearchError, hasMore, resultNodes } = useMemo(
    () => ({
      isSearchPending: queue.some((item) => item.isPending),
      isLoadingMore: queue.length > 1 && queue[queue.length - 1].isPending,
      isSearchError: queue.some((item) => item.error),
      hasMore: queue[queue.length - 1]?.result?.hasMore,
      resultNodes: queue
        .filter((item) => item.result)
        .sort((a, b) => a.result!.skip - b.result!.skip)
        .flatMap((item) => item.result!.nodes)
        .filter(getUniqueFilter((a, b) => a.id === b.id)),
    }),
    [queue]
  );

  // Get output state
  useEffect(() => {
    const showTopLoadingSpinner = isConnected === undefined || (isConnected && isSearchPending && !isLoadingMore);
    const showBottomLoadingSpinner = isLoadingMore;
    const shouldDetectBottom = !!isConnected && !isSearchPending && !isLoadingMore && resultNodes.length > 0;

    setOutputState((prevState) => ({
      showTopLoadingSpinner,
      showBottomLoadingSpinner,
      showErrorMessage: isSearchError,
      shouldDetectBottom,
      nodes: isSearchPending ? prevState.nodes : resultNodes,
    }));
  }, [isConnected, isSearchPending, isLoadingMore, isSearchError, resultNodes]);

  const { setScrollContainerRef, shouldLoadMore, scrollToTop, InfiniteScrollBottom } = useInfiniteScroll();

  useEffect(() => {
    if (shouldLoadMore && hasMore && !isSearchPending) {
      setInputState((prev) => ({
        ...prev,
        skip: prev.skip + PAGE_SIZE,
      }));
    }
  }, [hasMore, shouldLoadMore, isSearchPending]);

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
      <main class="c-app-layout__main u-scroll" ref={setScrollContainerRef}>
        {outputState.showTopLoadingSpinner && <div class="c-progress-bar" />}
        {outputState.showErrorMessage && (
          <section class="c-welcome-mat">
            <ErrorMessage />
          </section>
        )}
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
        {isConnected && (
          <ul class="c-list">
            {outputState.nodes.map((parentNode, index) => (
              <HitsArticle key={parentNode.id} node={parentNode} isParent={true} onClick={handleAddCard} />
            ))}
          </ul>
        )}
        {outputState.showBottomLoadingSpinner && <div class="c-progress-bar c-progress-bar--inline" />}
        {outputState.shouldDetectBottom && <InfiniteScrollBottom />}
      </main>
    </>
  );
}

render(<App worker={worker} />, document.getElementById("app") as HTMLElement);
