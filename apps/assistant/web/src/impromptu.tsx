import type { MessageToFigma, MessageToWeb, SelectionSummary } from "@h20/assistant-types";
import { useAuth } from "@h20/auth/preact-hooks";
import { getProxyToFigma } from "@h20/figma-tools";
import { render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { getH20Proxy } from "./modules/h20/proxy";
import { filter } from "./modules/inference/filter";
import { group } from "./modules/inference/group";
import { getChatProxy, getFnCallProxy } from "./modules/openai/proxy";
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

appInsights.trackPageView();

function App(props: { worker: WorkerClient<WorkerRoutes, WorkerEvents> }) {
  const { worker } = props;
  const { isConnected, signIn, accessToken } = useAuth({
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
  const [output, setOutput] = useState<any>(null);

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

  const handleGroup = useCallback(
    async (input: string) => {
      const response = await group(fnCallProxy, input, selection?.stickies ?? []);
      console.log(response);
      setOutput(response);
    },
    [chatProxy, selection]
  );

  const handleFilter = useCallback(
    async (input: string) => {
      const response = await filter(fnCallProxy, input, selection?.stickies ?? []);
      console.log(response);
      setOutput(response);
    },
    [fnCallProxy, selection]
  );

  const [tool, setTool] = useState<{ name: string; input: string }>({ name: "filter", input: "" });

  const handleRun = useCallback(async () => {
    switch (tool.name) {
      case "group":
        await handleGroup(tool.input);
        break;
      case "filter":
        await handleFilter(tool.input);
        break;
    }
  }, [handleFilter, handleGroup, tool]);

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
            <legend>Input</legend>
            <ul class="c-shelf">
              {selection?.stickies.map((sticky) => (
                <li key={sticky.id}>{JSON.stringify(sticky)}</li>
              ))}
            </ul>
          </fieldset>
          <fieldset>
            <legend>Tools</legend>
            <div>
              <select onChange={(e) => setTool((prev) => ({ ...prev, name: (e.target as HTMLSelectElement).value }))}>
                <option value={"filter"}>Filter</option>
                <option value={"group"}>Group</option>
              </select>
              <br />
              <textarea onChange={(e) => setTool((prev) => ({ ...prev, input: (e.target as HTMLTextAreaElement).value }))} placeholder={"Tool input"}>
                {tool.input}
              </textarea>
              <br />
              <button onClick={handleRun}>Run</button>
              <button onClick={() => {}}>Cancel</button>
            </div>
          </fieldset>
          <fieldset>
            <legend>Output</legend>
            <pre class="c-output">{JSON.stringify(output, null, 2)}</pre>
          </fieldset>
          <button onClick={() => proxyToFigma.notify({ disableImpromptu: true })}>Exit</button>
        </>
      )}
    </>
  );
}

render(<App worker={worker} />, document.getElementById("app") as HTMLElement);
