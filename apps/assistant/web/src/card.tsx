import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import { useAuth } from "@h20/auth/preact-hooks";
import { getProxyToFigma } from "@h20/figma-tools";
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { isClaimType } from "./modules/display/display-node";
import { handleDropHtml } from "./modules/handlers/handle-drop-html";
import { ErrorMessage } from "./modules/hits/error";
import { getHubSlug } from "./modules/hits/get-hub-slug";
import type { SearchResultTag } from "./modules/hits/hits";
import { ReportViewer } from "./modules/hits/report-viewer";
import { appInsights } from "./modules/telemetry/app-insights";
import type { WorkerEvents, WorkerRoutes } from "./routes";
import { WorkerClient } from "./utils/worker-rpc";
import WebWorker from "./worker?worker";

// start worker ASAP
const worker = new WorkerClient<WorkerRoutes, WorkerEvents>(new WebWorker()).start();

const proxyToFigma = getProxyToFigma<MessageToFigma, MessageToWeb>(import.meta.env.VITE_PLUGIN_ID);

// remove loading placeholder
document.getElementById("app")!.innerHTML = "";
window.focus();

// extract entityId as first step
const entityId = new URLSearchParams(location.search).get("entityId");
const entityType = parseInt(new URLSearchParams(location.search).get("entityType")!);
if (!entityId || Number.isNaN(entityType)) {
  document.getElementById("app")!.innerHTML = "Specify Type and Id to load the card";
  throw new Error("Missing Type or Id in the URL");
}

interface CardData {
  title: string;
  body: string;
  bodyOverflow: string;
  entityId: string;
  entityType: number;
  updatedOn: Date;
  tags: {
    displayName: string;
    url: string;
  }[];
  children: {
    entityId: string;
    entityType: number;
    title: string;
    body: string;
  }[];
  group: {
    displayName: string;
    url: string;
  };
  researchers: {
    displayName: string;
    url: string;
  }[];
}

const bodyTextOverflowThreshold = 100;
appInsights.trackPageView();

function App(props: { worker: WorkerClient<WorkerRoutes, WorkerEvents> }) {
  const { worker } = props;
  const { isConnected, signIn, accessToken, isTokenExpired } = useAuth({
    serverHost: import.meta.env.VITE_H20_SERVER_HOST,
    webHost: import.meta.env.VITE_WEB_HOST,
  });

  const [cardData, setCardData] = useState<CardData | null | undefined>(undefined);

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

  const toDisplayTag = useCallback(
    (typePrefix: string) => (searchTag: SearchResultTag) => ({
      displayName: searchTag.name,
      url: `https://hits.microsoft.com/${typePrefix}/${getHubSlug(searchTag.name)}`,
    }),
    []
  );

  const normalizeWhitespace = useCallback((text: string) => text.trim().replace(/\s+/g, " "), []);

  const flatItem: (item: { children?: any[] }) => any[] = (item) => [item, ...(item.children?.map(flatItem) ?? [])].flat();

  // Fetch entity content
  useEffect(() => {
    // We skip data fetching until token has valid expiry.
    // Note it is still possible for client to believe token is valid while the server has revoked it.
    // The background token request will hopefully fetch a valid token for the next round
    // In that case, we will set the data to null and give user a link to reload the page
    if (isTokenExpired) return;

    worker.request("getCardData", { accessToken, entityId: entityId!, entityType: entityType! }).then((result) => {
      const { cardData } = result;
      if (!cardData) {
        setCardData(null);
        return;
      }

      const outline = JSON.parse(cardData.outline);
      const flatIds = flatItem(outline)
        .filter(isClaimType)
        .map((item) => item.id.toString());

      const normalizedBodyWords = normalizeWhitespace(cardData.contents ?? "").split(" ");

      setCardData({
        entityId: cardData.id,
        title: normalizeWhitespace(cardData.title),
        body: cardData.abstract ?? normalizedBodyWords.slice(0, bodyTextOverflowThreshold).join(" "),
        bodyOverflow: cardData.abstract ? "" : normalizedBodyWords.slice(bodyTextOverflowThreshold).join(" "),
        entityType: cardData.entityType,
        updatedOn: new Date(cardData.updatedOn),
        group: {
          displayName: cardData.group.name,
          url: `https://hits.microsoft.com/group/${getHubSlug(cardData.group.name)}`,
        },
        researchers: cardData.researchers.map((researcher) => ({
          displayName: researcher.name,
          url: `https://hits.microsoft.com/researcher/${researcher.alias}`,
        })),
        children: cardData.children
          .filter(isClaimType)
          .sort((a, b) => flatIds.indexOf(a.id) - flatIds.indexOf(b.id))
          .map((child) => ({
            entityId: child.id,
            entityType: child.entityType,
            title: normalizeWhitespace(child.title ?? "Untitled"),
            body: normalizeWhitespace(child.contents ?? ""),
          })),
        tags: [...cardData.products.map(toDisplayTag("product")), ...cardData.topics.map(toDisplayTag("topic"))],
      });
    });
  }, [isTokenExpired]);

  return (
    <>
      {isConnected !== false && cardData === undefined && <div class="c-progress-bar" />}
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
      {isConnected === true && cardData === null && (
        <article class="c-card-article">
          <ErrorMessage />
        </article>
      )}
      {isConnected !== false && cardData && <ReportViewer class="c-scroll-area" entityId={entityId} report={cardData} />}
    </>
  );
}

render(<App worker={worker} />, document.getElementById("app") as HTMLElement);
