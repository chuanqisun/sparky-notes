import type { CardData, CreateCardsSummary, MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import { useAuth } from "@h20/auth/preact-hooks";
import { getProxyToFigma } from "@h20/figma-tools";
import { render, type JSX } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import type { HitsDisplayNode } from "./modules/display/display-node";
import { handleDropHtml } from "./modules/handlers/handle-drop-html";
import { HitsArticle } from "./modules/hits/article";
import { ErrorMessage } from "./modules/hits/error";
import { ReportViewer } from "./modules/hits/report-viewer";
import { useHandleAddCards } from "./modules/hits/use-handle-add-card";
import { useReportDetails } from "./modules/hits/use-report-details";
import { appInsights } from "./modules/telemetry/app-insights";
import type { SearchRes, WorkerEvents, WorkerRoutes } from "./routes";
import { debounce } from "./utils/debounce";
import { getDragContext } from "./utils/drag-and-drop";
import { getUniqueFilter } from "./utils/get-unique-filter";
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

const proxyToFigma = getProxyToFigma<MessageToFigma, MessageToWeb>(import.meta.env.VITE_PLUGIN_ID);

appInsights.trackPageView();

function App(props: { worker: WorkerClient<WorkerRoutes, WorkerEvents> }) {
  useEffect(() => {
    document.querySelector<HTMLInputElement>(`input[type="search"]`)?.focus();
  }, []);

  const { worker } = props;
  const { isConnected, signIn, signOut, accessToken, isTokenExpired } = useAuth({
    serverHost: import.meta.env.VITE_H20_SERVER_HOST,
    webHost: import.meta.env.VITE_WEB_HOST,
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = useCallback(() => setIsMenuOpen((isOpen) => !isOpen), []);

  // Figma RPC
  useEffect(() => {
    const handleMainMessage = (e: MessageEvent) => {
      const message = e.data.pluginMessage as MessageToWeb;
      console.log(`[ipc] Figma -> Web`, message);

      handleDropHtml(message, proxyToFigma);
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
  const handleAddCards = useHandleAddCards(appInsights, proxyToFigma);

  const handleDragStart = useCallback((cardData: CardData, e: DragEvent) => {
    if (!e.dataTransfer || !e.target) return;

    appInsights.trackEvent({ name: "add-card" }, { gesture: "drag" });
    const createCardSummary: CreateCardsSummary = { cards: [cardData], webDragContext: getDragContext(e) };

    // e.dataTransfer.setData("text/html", `<a href="${getEntityUrl(cardData.entityType, cardData.entityId)}">${cardData.title}</a>`);
    e.dataTransfer.setData("application/x.hits.drop-card", JSON.stringify(createCardSummary));
  }, []);

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

  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  useEffect(() => {
    if (selectedCard) {
      (document.getElementById("report-viewer-dialog") as HTMLDialogElement)?.showModal();
    }
  }, [selectedCard]);

  const { report, isLoading: isReportDetailsLoading } = useReportDetails({
    isTokenExpired,
    accessToken,
    entityId: selectedCard?.entityId,
    entityType: selectedCard?.entityType,
    worker,
  });

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
                {query === "dolegendaryshit" ? (
                  <button class="u-reset c-app-menu--btn" onClick={() => proxyToFigma.notify({ enableCopilot: true })}>
                    Copilot
                  </button>
                ) : null}
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
        {selectedCard ? (
          <dialog id="report-viewer-dialog" class="c-app-layout c-report-viewer-overlay">
            <header class="c-app-header">
              <button class="u-reset c-back-button c-bottom-divider" onClick={() => setSelectedCard(null)}>
                Back to search results
              </button>
            </header>
            <div class="c-app-layout__main u-scroll">
              {isReportDetailsLoading && <div class="c-progress-bar" />}
              {!isReportDetailsLoading && report && <ReportViewer report={report} onAddCards={handleAddCards} />}
            </div>
          </dialog>
        ) : null}
        {isConnected && (
          <ul class="c-list">
            {outputState.nodes.map((parentNode, index) => (
              <HitsArticle key={parentNode.id} node={parentNode} isParent={true} onClick={setSelectedCard} onDragStart={handleDragStart} />
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
