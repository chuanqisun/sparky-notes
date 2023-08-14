import type { CardData, MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import { useAuth } from "@h20/auth/preact-hooks";
import { getProxyToFigma } from "@h20/figma-tools";
import { render } from "preact";
import { useSharedFigmaEventHandlers } from "./modules/handlers/use-shared-figma-event-handlers";
import { ErrorMessage } from "./modules/hits/error";
import { ReportViewer } from "./modules/hits/report-viewer";
import { useHandleAddCards } from "./modules/hits/use-handle-add-cards";
import { useReportDetails } from "./modules/hits/use-report-details";
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
const entityId = new URLSearchParams(location.search).get("entityId")!;
const entityType = parseInt(new URLSearchParams(location.search).get("entityType")!);
if (!entityId || Number.isNaN(entityType)) {
  document.getElementById("app")!.innerHTML = "Specify Type and Id to load the card";
  throw new Error("Missing Type or Id in the URL");
}

appInsights.trackPageView();

function App(props: { worker: WorkerClient<WorkerRoutes, WorkerEvents> }) {
  const { worker } = props;
  const { isConnected, signIn, accessToken, isTokenExpired } = useAuth({
    serverHost: import.meta.env.VITE_H20_SERVER_HOST,
    webHost: import.meta.env.VITE_WEB_HOST,
  });

  // handle figma events
  useSharedFigmaEventHandlers({ proxyToFigma, appInsights });

  // handle ui events
  const handleAddCards = useHandleAddCards(proxyToFigma);
  const handleOpenCard = (cardData: CardData) => {
    appInsights.trackEvent({ name: "opened-card" }, { cardData });
  };

  const { report } = useReportDetails({
    isTokenExpired,
    accessToken,
    entityId,
    entityType,
    worker,
  });

  return (
    <>
      {isConnected !== false && report === undefined && <div class="c-progress-bar" />}
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
      {isConnected === true && report === null && (
        <article class="c-card-article">
          <ErrorMessage />
        </article>
      )}
      {isConnected !== false && report && <ReportViewer className="c-scroll-area" report={report} onAddCards={handleAddCards} onOpenCard={handleOpenCard} />}
    </>
  );
}

render(<App worker={worker} />, document.getElementById("app") as HTMLElement);
