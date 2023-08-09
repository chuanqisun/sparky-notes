import type { MessageToWeb, SelectionSummary } from "@h20/assistant-types";
import { useAuth } from "@h20/auth/preact-hooks";
import { render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { getH20Proxy } from "./modules/h20/proxy";
import { getChatProxy, getFnCallProxy } from "./modules/openai/proxy";
import { appInsights } from "./modules/telemetry/app-insights";
import type { WorkerEvents, WorkerRoutes } from "./routes";
import { WorkerClient } from "./utils/worker-rpc";
import WebWorker from "./worker?worker";

// start worker ASAP
const worker = new WorkerClient<WorkerRoutes, WorkerEvents>(new WebWorker()).start();

// remove loading placeholder
document.getElementById("app")!.innerHTML = "";
window.focus();

appInsights.trackPageView();

function App(props: { worker: WorkerClient<WorkerRoutes, WorkerEvents> }) {
  const { worker } = props;
  const { isConnected, signIn, accessToken, isTokenExpired } = useAuth({
    serverHost: import.meta.env.VITE_H20_SERVER_HOST,
    webHost: import.meta.env.VITE_WEB_HOST,
  });

  const { chatProxy, fnCallProxy } = useMemo(() => {
    const h20Proxy = getH20Proxy(accessToken);

    return {
      chatProxy: getChatProxy(h20Proxy),
      fnCallProxy: getFnCallProxy(h20Proxy),
    };
  }, [accessToken]);

  const [selection, setSelection] = useState<SelectionSummary | null>(null);

  // Figma RPC
  useEffect(() => {
    const handleMainMessage = (e: MessageEvent) => {
      const pluginMessage = e.data.pluginMessage as MessageToWeb;
      console.log(`[ipc] Main -> UI`, pluginMessage);

      if (pluginMessage.selectionChanged) {
        setSelection(pluginMessage.selectionChanged);
      }
    };

    window.addEventListener("message", handleMainMessage);

    return () => window.removeEventListener("message", handleMainMessage);
  }, []);

  const handleGroup = useCallback(async () => {
    const response = await chatProxy([{ role: "user", content: "Hello AI!" }]);
    console.log(response);
  }, [chatProxy, selection]);

  return (
    <>
      {isConnected === undefined && <div class="c-progress-bar" />}
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
      {isConnected === true && (
        <>
          <fieldset>
            <legend>Shelf</legend>
            <ul>
              {selection?.stickies.map((sticky) => (
                <li key={sticky.id}>{JSON.stringify(sticky)}</li>
              ))}
            </ul>
          </fieldset>
          <fieldset>
            <legend>Action</legend>
            <button onClick={handleGroup}>Group</button>
          </fieldset>
          <fieldset>
            <legend>Output</legend>
          </fieldset>
        </>
      )}
    </>
  );
}

render(<App worker={worker} />, document.getElementById("app") as HTMLElement);
