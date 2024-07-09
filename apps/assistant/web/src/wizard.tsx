import type { MessageToFigma, MessageToWeb, SelectionSummary } from "@h20/assistant-types";
import { useAuth } from "@h20/auth/preact-hooks";
import { getProxyToFigma } from "@h20/figma-tools";
import { render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { abortTask } from "./modules/copilot/abort";
import type { Tool } from "./modules/copilot/tool";
import { filterTool } from "./modules/copilot/tools/filter";
import { synthesizeTool } from "./modules/copilot/tools/synthesize";
import { useMaxProxy } from "./modules/max/use-max-proxy";
import { appInsights } from "./modules/telemetry/app-insights";
import { ProgressBar } from "./styles/components/progress-bar";
import { Welcome } from "./styles/components/welcome";

const proxyToFigma = getProxyToFigma<MessageToFigma, MessageToWeb>(import.meta.env.VITE_PLUGIN_ID);

// remove loading placeholder
document.getElementById("app")!.innerHTML = "";
window.focus();

appInsights.trackPageView();

function App() {
  const { isConnected, signIn, accessToken } = useAuth({
    serverHost: import.meta.env.VITE_H20_SERVER_HOST,
    webHost: import.meta.env.VITE_WEB_HOST,
  });

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

  const { chatCompletions, chatCompletionsStream } = useMaxProxy({ accessToken });

  const tools = useMemo(
    () => [synthesizeTool(chatCompletionsStream, proxyToFigma), filterTool(chatCompletions, proxyToFigma)],
    [chatCompletions, chatCompletionsStream]
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
        appInsights.trackEvent({ name: "tool-run", properties: { tool: activeTool.tool.id } });
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
    <>
      {isConnected === undefined && <ProgressBar />}
      {isConnected === false && <Welcome onSignIn={signIn} />}
      {isConnected === true && (
        <div class="c-module-stack">
          <nav class="c-nav-header">
            <a href="/index.html">← Back to search</a>
          </nav>
          <section class="c-module-stack__scroll">
            <h2>Utils</h2>
          </section>
          <section class="c-module-stack__scroll">
            <h2>User message</h2>
          </section>
        </div>
      )}
    </>
  );
}

render(<App />, document.getElementById("app") as HTMLElement);
