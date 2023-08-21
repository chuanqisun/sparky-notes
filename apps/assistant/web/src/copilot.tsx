import type { MessageToFigma, MessageToWeb, RenderShelf, SelectionSummary, SerializedShelf } from "@h20/assistant-types";
import { useAuth } from "@h20/auth/preact-hooks";
import { getProxyToFigma } from "@h20/figma-tools";
import { render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import type { ParsedShelf, Tool } from "./modules/copilot/tool";
import { filterTool } from "./modules/copilot/tools/filter";
import { groupTool } from "./modules/copilot/tools/group";
import { getH20Proxy } from "./modules/h20/proxy";
import { convertFileByExtension } from "./modules/io/convert";
import { pickFiles } from "./modules/io/pick-files";
import { ObjectTree } from "./modules/object-tree/object-tree";
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

  const tools = useMemo(() => [filterTool(fnCallProxy), groupTool(fnCallProxy)], [fnCallProxy]);
  const [activeTool, setActiveTool] = useState<{ tool: Tool; args: Record<string, string> }>({ tool: tools[0], args: {} });

  const parseShelf = useCallback((shelf: SerializedShelf) => {
    const parsed: ParsedShelf = {
      ...shelf,
      data: JSON.parse(shelf.rawData),
    };

    return parsed;
  }, []);

  const serializeShelf = useCallback((shelf: ParsedShelf) => {
    const serialized: SerializedShelf = {
      ...shelf,
      rawData: JSON.stringify(shelf.data),
    };

    return serialized;
  }, []);

  const serializeNewShelf = useCallback((shelf: Omit<ParsedShelf, "id">) => {
    const serialized: Omit<SerializedShelf, "id"> = {
      ...shelf,
      rawData: JSON.stringify(shelf.data),
    };

    return serialized;
  }, []);

  const updateShelf = useCallback(async (updateFn: (prev: ParsedShelf) => ParsedShelf) => {
    const { getSelectionRes } = await proxyToFigma.request({ getSelectionReq: true });

    if (!getSelectionRes) return;

    const selectedAbstractShelf = getSelectionRes.abstractShelves.at(0);
    if (!selectedAbstractShelf) return;

    const prevShelf = parseShelf(selectedAbstractShelf);
    const updatedShelf = updateFn(prevShelf);

    proxyToFigma.notify({ updateShelf: serializeShelf(updatedShelf) });
  }, []);

  const handleRun = useCallback(async () => {
    const selectedAbstractShelf = selection?.abstractShelves.at(0);
    if (!selectedAbstractShelf) return;

    const prevShelf = parseShelf(selectedAbstractShelf);

    proxyToFigma.notify({ createShelf: serializeNewShelf({ name: "New shelf", data: [] }) });

    activeTool.tool?.run({
      shelf: prevShelf,
      args: activeTool.args,
      update: updateShelf,
    });
  }, [activeTool, selection, updateShelf]);

  const handleCreateShelfFromCanvas = useCallback(async () => {
    const data = (selection?.stickies ?? []).map((item) => item.text);
    proxyToFigma.notify({ createShelf: serializeNewShelf({ name: "New shelf", data }) });
  }, [selection]);

  const handleCreateShelfFromUpload = useCallback(async () => {
    const [file] = await pickFiles({
      accept: "application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const converted = await convertFileByExtension(file);
    proxyToFigma.notify({ createShelf: { name: file.name, rawData: JSON.stringify(converted) } });
  }, []);

  const handleExportToCanvas = useCallback(async () => {
    if (!selection?.abstractShelves.length) return;

    const selectedShelf = selection.abstractShelves.at(0)!;

    const shelf: RenderShelf = {
      name: selectedShelf.name,
      rawData: selectedShelf.rawData,
    };
    proxyToFigma.notify({ renderShelf: shelf });
  }, [selection]);

  const [isShelfMenuOpen, setIsShelfMenuOpen] = useState(false);

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
          <fieldset class="c-fieldset">
            <div class="c-field">
              <div class="c-field__key c-field__key--with-menu">
                Shelf{" "}
                <div class="c-overflow-menu">
                  <button class="c-overflow-menu__trigger" onClick={() => setIsShelfMenuOpen((prev) => !prev)}>
                    ...
                  </button>
                  {isShelfMenuOpen ? (
                    <div class="c-overflow-menu__actions">
                      <button onClick={handleExportToCanvas}>Export to Canvas</button>
                    </div>
                  ) : null}
                </div>
              </div>
              {selection?.abstractShelves?.length ? (
                <ul class="c-field__value c-shelf">
                  {selection?.abstractShelves.map((shelf) => (
                    <ObjectTree key={shelf.id} data={{ [shelf.name]: JSON.parse(shelf.rawData) }} />
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
          {selection?.abstractShelves.length ? (
            <fieldset class="c-fieldset">
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
              </div>
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
              <div class="c-fieldset__actions">
                <button onClick={handleRun}>Run</button>
                <button onClick={() => {}}>Cancel</button>
              </div>
            </fieldset>
          ) : null}

          <button onClick={() => proxyToFigma.notify({ disableCopilot: true })}>Exit copilot</button>
        </div>
      )}
    </>
  );
}

render(<App worker={worker} />, document.getElementById("app") as HTMLElement);
