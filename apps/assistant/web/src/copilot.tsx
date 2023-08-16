import type { MessageToFigma, MessageToWeb, SelectionSummary } from "@h20/assistant-types";
import { useAuth } from "@h20/auth/preact-hooks";
import { getProxyToFigma } from "@h20/figma-tools";
import { render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import type { Tool } from "./modules/copilot/tool";
import { filterTool } from "./modules/copilot/tools/filter";
import { groupTool } from "./modules/copilot/tools/group";
import { getH20Proxy } from "./modules/h20/proxy";
import { convertFileByExtension } from "./modules/io/convert";
import { pickFiles } from "./modules/io/pick-files";
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

  const tools = useMemo(() => [filterTool(fnCallProxy), groupTool(fnCallProxy)], []);
  const [activeTool, setActiveTool] = useState<{ tool: Tool; args: Record<string, string> }>({ tool: tools[0], args: {} });

  const handleRun = useCallback(async () => {
    await activeTool.tool?.run({ shelf: selection?.stickies.map((sticky) => sticky.text) ?? [], args: activeTool.args, setOutput });
  }, [activeTool, setOutput, selection]);

  const handleCreateShelfFromCanvas = useCallback(async () => {
    const data = (selection?.stickies ?? []).map((item) => item.text);
    proxyToFigma.notify({ createShelf: { rawData: JSON.stringify(data) } });
  }, [selection]);

  const handleCreateShelfFromUpload = useCallback(async () => {
    const [file] = await pickFiles({
      accept: "application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const converted = await convertFileByExtension(file);
    proxyToFigma.notify({ createShelf: { name: file.name, rawData: JSON.stringify(converted) } });
  }, []);

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
        <div class="c-module-stack">
          <fieldset>
            <div class="c-field">
              <div class="c-field__key">Shelf</div>
              {selection?.shelves?.length ? (
                <ul class="c-field__value c-shelf">
                  {selection?.shelves.map((shelf) => (
                    <div key={shelf.id} class="c-object-viewer">
                      <ObjectTreeNode data={{ [shelf.name]: JSON.parse(shelf.rawData) }} />
                    </div>
                  ))}
                </ul>
              ) : (
                <div class="c-field__actions">
                  <button onClick={handleCreateShelfFromCanvas} disabled={!selection?.stickies.length}>
                    Create
                  </button>
                  <button onClick={handleCreateShelfFromUpload}>Upload</button>
                </div>
              )}
            </div>
          </fieldset>
          <fieldset>
            <div class="c-field">
              <label class="c-field__key" for="tool-select">
                Action
              </label>
              <select
                class="c-field__value"
                id="tool-select"
                onChange={(e) => {
                  setActiveTool((prev) => ({
                    ...prev,
                    tool: tools.find((tool) => tool.id === (e.target as HTMLOptionElement).value) ?? prev.tool,
                    args: {},
                  }));
                }}
              >
                {tools.map((tool) => (
                  <option key={tool.id} value={tool.id}>
                    {tool.displayName}
                  </option>
                ))}
              </select>
              {activeTool.tool.parameters.map((parameter) => (
                <div class="c-field" key={parameter.key}>
                  <label class="c-field__key" for={`${activeTool.tool.id}-${parameter.key}-input`}>
                    {parameter.displayName}
                  </label>
                  <input
                    id={`${activeTool.tool.id}-${parameter.key}-input`}
                    class="c-field__value"
                    type="text"
                    placeholder={parameter.hint}
                    required={!parameter.isOptional}
                    onChange={(e) =>
                      setActiveTool((prev) => ({
                        ...prev,
                        args: {
                          ...prev.args,
                          [parameter.key]: (e.target as HTMLInputElement).value,
                        },
                      }))
                    }
                    value={activeTool.args[parameter.key]}
                  />
                </div>
              ))}
              <div class="c-field__actions">
                <button onClick={handleRun}>Run</button>
                <button onClick={() => {}}>Cancel</button>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <div class="c-field">
              <label class="c-field__key">Export</label>
              <pre class="c-field__value c-output">{JSON.stringify(output, null, 2)}</pre>
            </div>
          </fieldset>
          <button onClick={() => proxyToFigma.notify({ disableCopilot: true })}>Exit copilot</button>
        </div>
      )}
    </>
  );
}

render(<App worker={worker} />, document.getElementById("app") as HTMLElement);

const isPrimitive = (data: any) => typeof data !== "object" || data === null;

/** Render array as a list of <details><summary/><details/>, render object and <dl><dt><dd> */
function ObjectTreeNode({ data }: any) {
  if (typeof data !== "object") return <span>{data.toString()}</span>;
  if (data === null) return <span>null</span>;

  if (Array.isArray(data)) {
    return (
      <>
        {data.map((item, index) => (
          <>
            <details key={index}>
              <summary>{index}</summary>
              <div class="c-object-viewer__details">
                <ObjectTreeNode data={item} />
              </div>
            </details>
          </>
        ))}
      </>
    );
  } else {
    return (
      <>
        {Object.entries(data).map(([key, value], index) => (
          <>
            {isPrimitive(value) ? (
              <div key={index}>
                <span class="c-object-viewer__key">{key}</span>: <span class="c-object-viewer__value">{value as any}</span>
              </div>
            ) : (
              <details key={index}>
                <summary>{key}</summary>
                <div class="c-object-viewer__details">
                  <ObjectTreeNode data={value} />
                </div>
              </details>
            )}
          </>
        ))}
      </>
    );
  }
}
