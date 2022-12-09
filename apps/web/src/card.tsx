import type { MessageToUI } from "@h20/types";
import { Fragment, render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { EntityDisplayName, EntityIcon, EntityName, EntityType } from "./modules/hits/entity";
import { getHubSlug } from "./modules/hits/get-hub-slug";
import type { SearchResultTag } from "./modules/hits/hits";
import { useAuth } from "./modules/hits/use-auth";
import { useConfig } from "./modules/hits/use-config";
import { useLog } from "./modules/status/status-bar";
import type { WorkerEvents, WorkerRoutes } from "./routes";
import { getParentOrigin, sendMessage } from "./utils/figma-rpc";
import { WorkerClient } from "./utils/worker-rpc";
import WebWorker from "./worker?worker";

// start worker ASAP
const worker = new WorkerClient<WorkerRoutes, WorkerEvents>(new WebWorker()).start();

// remove loading placeholder
document.getElementById("app")!.innerHTML = "";
window.focus();

// extract entityId as first step
const entityId = new URLSearchParams(location.search).get("entityId");
const entityType = parseInt(new URLSearchParams(location.search).get("entityType")!);
if (!entityId || Number.isNaN(entityType)) {
  document.getElementById("app")!.innerHTML = "Specify an Type and Id to load the card";
  console.warn("Type or Id not found");
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

function App(props: { worker: WorkerClient<WorkerRoutes, WorkerEvents> }) {
  const notifyFigma = useCallback(sendMessage.bind(null, getParentOrigin(), import.meta.env.VITE_PLUGIN_ID), []);
  const { log, lines } = useLog();

  const { worker } = props;
  const { isConnected, signIn, signOut } = useAuth();
  const { value: configValue } = useConfig();

  const [cardData, setCardData] = useState<CardData | null>(null);

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

  // Fetch entity content
  useEffect(() => {
    // Assume user is already connected to reduce latency

    worker.request("getCardData", { config: configValue, entityId: entityId!, entityType: entityType! }).then((result) => {
      const { cardData } = result;
      if (!cardData) return;

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
          .filter((child) => [EntityType.Insight, EntityType.Recommendation].includes(child.entityType))
          .map((child) => ({
            entityId: child.id,
            entityType: child.entityType,
            title: normalizeWhitespace(child.title ?? "Untitled"),
            body: normalizeWhitespace(child.contents ?? ""),
          })),
        tags: [...cardData.products.map(toDisplayTag("product")), ...cardData.topics.map(toDisplayTag("topic"))],
      });
    });
  }, []);

  // Auto expand highlighted child entity
  useEffect(() => {
    if (!cardData) return;
    const accordion = document.querySelector<HTMLDetailsElement>(`details[data-entity-id="${entityId}"]`);
    if (!accordion) return;

    accordion.open = true;
    accordion.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [cardData]);

  const [isBodyExpanded, setIsBodyExpanded] = useState(false);

  return (
    <>
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
      {isConnected === true && cardData && (
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
          <h1 class="c-card-title">{cardData.entityId === entityId ? <mark>{cardData.title}</mark> : cardData.title}</h1>
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
            <p>
              <span class="c-card-body" data-overflow={!isBodyExpanded && !!cardData.bodyOverflow}>
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
                    <img src={EntityIcon[child.entityType]} />
                    <span class="c-child-title">{child.entityId === entityId ? <mark>{child.title}</mark> : child.title}</span>
                  </summary>
                  {child.body.length ? <p class="c-child-details">{child.body}</p> : null}
                </details>
              </li>
            ))}
          </ul>
          <a class="c-card-full-report-link" target="_blank" href={`https://hits.microsoft.com/${EntityName[entityType]}/${entityId}`}>
            Open full report
          </a>
        </article>
      )}
    </>
  );
}

render(<App worker={worker} />, document.getElementById("app") as HTMLElement);
