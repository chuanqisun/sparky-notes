import type { MessageToUI } from "@h20/types";
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { EntityName } from "./modules/hits/entity";
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
  entityId: string;
  entityType: number;
  updatedOn: Date;
  tags: {
    displayName: string;
    url: string;
  }[];
  children: {
    entityId: string;
    title: string;
  }[];
}

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

  // Fetch entity content
  useEffect(() => {
    // Assume user is already connected to reduce latency

    worker.request("getCardData", { config: configValue, entityId: entityId!, entityType: entityType! }).then((result) => {
      const { cardData } = result;
      if (!cardData) return;

      setCardData({
        entityId: cardData.id,
        title: cardData.title,
        entityType: cardData.entityType,
        updatedOn: new Date(cardData.updatedOn),
        children: cardData.children.map((child) => ({ entityId: child.id, title: child.title ?? "Untitled" })),
        tags: [...cardData.products.map(toDisplayTag("product")), ...cardData.topics.map(toDisplayTag("topic"))],
      });
    });
  }, []);

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
        <article>
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
          <p>{cardData.updatedOn.toLocaleString()}</p>
          <ul>
            {cardData.children.map((child) => (
              <li key={child.entityId}>{child.entityId === entityId ? <mark>{child.title}</mark> : child.title}</li>
            ))}
          </ul>
          <a target="_blank" href={`https://hits.microsoft.com/${EntityName[entityType]}/${entityId}`}>
            Open in browser
          </a>
        </article>
      )}
    </>
  );
}

render(<App worker={worker} />, document.getElementById("app") as HTMLElement);
