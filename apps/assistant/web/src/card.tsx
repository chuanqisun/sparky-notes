import type { MessageToUI } from "@h20/assistant-types";
import { CONFIG_CACHE_KEY, TOKEN_CACHE_KEY, getInitialConfig, getInitialToken, useAuth, validateConfig, validateToken } from "@h20/auth";
import { Fragment, render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { isClaimType } from "./modules/display/display-node";
import { getParentOrigin, sendMessage } from "./modules/figma/figma-rpc";
import { EntityDisplayName, EntityIconComponent, EntityName } from "./modules/hits/entity";
import { ErrorMessage } from "./modules/hits/error";
import { getHubSlug } from "./modules/hits/get-hub-slug";
import type { SearchResultTag } from "./modules/hits/hits";
import { appInsights } from "./modules/telemetry/app-insights";
import type { WorkerEvents, WorkerRoutes } from "./routes";
import { ensureJson } from "./utils/local-storage";
import { WorkerClient } from "./utils/worker-rpc";
import WebWorker from "./worker?worker";

// start worker ASAP
const worker = new WorkerClient<WorkerRoutes, WorkerEvents>(new WebWorker()).start();

// remove loading placeholder
document.getElementById("app")!.innerHTML = "";
window.focus();

ensureJson(CONFIG_CACHE_KEY, validateConfig, getInitialConfig);
ensureJson(TOKEN_CACHE_KEY, validateToken, getInitialToken);

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
  const notifyFigma = useCallback(sendMessage.bind(null, getParentOrigin(), import.meta.env.VITE_PLUGIN_ID), []);

  const { worker } = props;
  const { isConnected, signIn, accessToken, isTokenExpired } = useAuth({
    hitsAuthEndpoint: import.meta.env.VITE_HITS_AUTH_ENDPOINT,
    webHost: import.meta.env.VITE_WEB_HOST,
  });

  const [cardData, setCardData] = useState<CardData | null | undefined>(undefined);

  // Figma RPC
  useEffect(() => {
    const handleMainMessage = (e: MessageEvent) => {
      const pluginMessage = e.data.pluginMessage as MessageToUI;
      console.log(`[ipc] Main -> UI`, pluginMessage);
      // TBD
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

  // Auto expand highlighted child entity
  useEffect(() => {
    if (!cardData) return;
    const accordion = document.querySelector<HTMLDetailsElement>(`details[data-entity-id="${entityId}"]`);
    if (!accordion) return;

    accordion.open = true;
    accordion.querySelector("summary")!.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [cardData]);

  const [isBodyExpanded, setIsBodyExpanded] = useState(false);

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
      {isConnected !== false && cardData && (
        <article class="c-card-article">
          {cardData.tags ? (
            <ul class="c-tag-list">
              {cardData.tags.map((tag) => (
                <li key={tag.url}>
                  <a class="c-tag" target="_blank" href={tag.url}>
                    {tag.displayName}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <h1 class="c-card-title" data-highlight={cardData.entityId === entityId}>
            {cardData.title}
          </h1>
          <p class="c-card-byline">
            {EntityDisplayName[cardData.entityType]} ·{" "}
            <a class="c-card-meta-link" href={cardData.group.url} target="_blank">
              {cardData.group.displayName}
            </a>{" "}
            ·{" "}
            {cardData.researchers.map((researcher, index) => (
              <Fragment key={researcher.url}>
                {index > 0 ? ", " : ""}
                <a class="c-card-meta-link" href={researcher.url} target="_blank">
                  {researcher.displayName}
                </a>
              </Fragment>
            ))}{" "}
            · {cardData.updatedOn.toLocaleString()}
          </p>
          <button class="u-reset" onClick={() => setIsBodyExpanded((prev) => !prev)}>
            <p class="c-card-body">
              <span class="c-card-body__visible" data-overflow={!isBodyExpanded && !!cardData.bodyOverflow}>
                {cardData.body}
              </span>
              {isBodyExpanded && cardData.bodyOverflow && <span> {cardData.bodyOverflow}</span>}
            </p>
          </button>
          <ul class="c-child-entity-list">
            {cardData.children.map((child) => (
              <li key={child.entityId}>
                <details class="c-child-accordion__container" data-entity-id={child.entityId} data-has-details={child.body.length > 0}>
                  <summary class="c-child-accordion__title">
                    {EntityIconComponent[child.entityType]()}
                    <span class="c-child-title" data-highlight={child.entityId === entityId}>
                      {child.title}
                    </span>
                  </summary>
                  {child.body.length ? <p class="c-child-details">{child.body}</p> : null}
                </details>
              </li>
            ))}
          </ul>
          <a class="c-card-full-report-link" target="_blank" href={`https://hits.microsoft.com/${EntityName[cardData.entityType]}/${cardData.entityId}`}>
            Full report
          </a>
        </article>
      )}
    </>
  );
}

render(<App worker={worker} />, document.getElementById("app") as HTMLElement);
