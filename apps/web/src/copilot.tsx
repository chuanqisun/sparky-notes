import type { MessageToFigma, MessageToWeb, SelectionSummary } from "@sticky-plus/figma-ipc-types";
import { getProxyToFigma } from "@sticky-plus/figma-tools";
import { render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { abortTask } from "./modules/copilot/abort";
import type { Tool } from "./modules/copilot/tool";
import { filterTool } from "./modules/copilot/tools/filter";
import { synthesizeTool } from "./modules/copilot/tools/synthesize";
import { contentNodesToObject } from "./modules/object-tree/content-nodes-to-objects";
import { ObjectTree } from "./modules/object-tree/object-tree";

const proxyToFigma = getProxyToFigma<MessageToFigma, MessageToWeb>(import.meta.env.VITE_PLUGIN_ID);

// remove loading placeholder
document.getElementById("app")!.innerHTML = "";
window.focus();



function App() {


  const [selection, setSelection] = useState<SelectionSummary | null>(null);

  // Figma RPC
  useEffect(() => {
    const handleMainMessage = (e: MessageEvent) => {
      const pluginMessage = e.data.pluginMessage as MessageToWeb;
      console.log(`[ipc] Main -> UI`, pluginMessage);

      if (pluginMessage.selectionChanged) {
        setSelection(pluginMessage.selectionChanged);
      }

      if (pluginMessage.abortTask) {
        abortTask(pluginMessage.abortTask);
      }
    };

    window.addEventListener("message", handleMainMessage);

    return () => window.removeEventListener("message", handleMainMessage);
  }, []);

  useEffect(() => {
    proxyToFigma.notify({ detectSelection: true });
  }, []);


  const tools = useMemo(
    () => [synthesizeTool(proxyToFigma), filterTool(proxyToFigma)],
    [],
    // [chatCompletions, chatCompletionsStream]
  );
  const [activeTool, setActiveTool] = useState<{ tool: Tool; args: Record<string, string> }>({ tool: tools[0], args: {} });

  const handleRun = useCallback(
    async (action: string) => {
      const input = selection?.contentNodes ?? [];
      if (!input.length) {
        proxyToFigma.notify({
          showNotification: {
            message: "No stickies were selected",
          },
        });
        return;
      }
      try {
        await activeTool.tool.run?.({
          input,
          action,
          args: activeTool.args,
        });
      } catch (e) {
        // noop on abort error
        if ((e as Error)?.name === "AbortError") return;

        proxyToFigma.notify({
          showNotification: {
            message: `${[(e as Error).name, (e as Error).message].filter(Boolean).join(" | ")}`,
            config: {
              error: true,
            },
          },
        });
      }
    },
    [selection, activeTool]
  );

  return (
    <div class="c-module-stack">
      <nav class="c-nav-header">
        <a href="/index.html">← Back to search</a>
      </nav>
      <fieldset class="c-fieldset">
        <div class="c-field">
          <label class="c-field__key" for="tool-select">
            Tool
          </label>
          <div class="c-field__value">
            <select
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
        </div>
        {activeTool.tool.parameters.map((parameter) => (
          <div class="c-field" key={parameter.key}>
            <label class="c-field__key" for={`${activeTool.tool.id}-${parameter.key}-input`}>
              {parameter.displayName}
            </label>
            <div class="c-field__value">
              <textarea
                id={`${activeTool.tool.id}-${parameter.key}-input`}
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
          </div>
        ))}
        <div class="c-fieldset__actions">
          {activeTool.tool
            .getActions({
              input: selection?.contentNodes ?? [],
              args: activeTool.args,
            })
            .map((action) => (
              <button class="c-fieldset__action" key={action} onClick={() => handleRun(action)}>
                {action}
              </button>
            ))}
        </div>
      </fieldset>
      <fieldset class="c-fieldset c-module-stack__scroll">
        <div class="c-field c-field--scroll">
          <div class="c-field__key">Input</div>
          <ul class="c-field__value c-field__value--scroll">
            {selection?.contentNodes?.length ? (
              <ObjectTree data={contentNodesToObject(selection?.contentNodes ?? [])} />
            ) : (
              <div>Select sections or stickies as input to the tool</div>
            )}
          </ul>
        </div>
      </fieldset>
    </div>
  );
}

render(<App />, document.getElementById("app") as HTMLElement);
