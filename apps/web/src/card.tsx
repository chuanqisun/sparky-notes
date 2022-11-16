import type { MessageToUI } from "@h20/types";
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { useAuth } from "./modules/hits/use-auth";
import { useConfig } from "./modules/hits/use-config";
import { useLog } from "./modules/status/status-bar";
import type { WorkerEvents, WorkerRoutes } from "./routes";
import { sendMessage } from "./utils/figma-rpc";
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
  throw new Error("Type or Id not found");
}

interface CardData {
  title: string;
  updatedOn: Date;
  children: {
    entityId: string;
    title: string;
  }[];
}

function App(props: { worker: WorkerClient<WorkerRoutes, WorkerEvents> }) {
  const notifyFigma = useCallback(sendMessage.bind(null, import.meta.env.VITE_IFRAME_HOST_ORIGIN, import.meta.env.VITE_PLUGIN_ID), []);
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

  // Fetch entity content
  useEffect(() => {
    // Assume user is already connected to reduce latency

    worker.request("getCardData", { config: configValue, entityId: entityId!, entityType: entityType! }).then((result) => {
      if (!result.cardData) return;

      setCardData({
        title: result.cardData.title,
        updatedOn: new Date(result.cardData.updatedOn),
        children: result.cardData.children.map((child) => ({ entityId: child.id, title: child.title ?? "Untitled" })),
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
          <h1>{cardData.title}</h1>
          <p>{cardData.updatedOn.toLocaleString()}</p>
          <ul>
            {cardData.children.map((child) => (
              <li key={child.entityId}>{child.title}</li>
            ))}
          </ul>
        </article>
      )}
    </>
  );
}

render(<App worker={worker} />, document.getElementById("app") as HTMLElement);
