import type { MessageToFigma, MessageToWeb, SelectionSummary } from "@h20/assistant-types";
import { useAuth } from "@h20/auth/preact-hooks";
import { getProxyToFigma } from "@h20/figma-tools";
import { render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { abortTask } from "./modules/copilot/abort";
import type { Tool } from "./modules/copilot/tool";
import { filterTool } from "./modules/copilot/tools/filter";
import { synthesizeTool } from "./modules/copilot/tools/synthesize";
import { getH20Proxy } from "./modules/h20/proxy";
import { getAbortChat, getChat } from "./modules/openai/proxy";
import { appInsights } from "./modules/telemetry/app-insights";

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

  const [chatProxy, chatAbortProxy] = useMemo(() => {
    const h20Proxy = getH20Proxy(accessToken);
    const chatProxy = getChat(h20Proxy);
    const chatAbortProxy = getAbortChat(h20Proxy);
    return [chatProxy, chatAbortProxy];
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

  const tools = useMemo(() => [synthesizeTool(chatProxy, chatAbortProxy, proxyToFigma), filterTool(chatProxy, chatAbortProxy, proxyToFigma)], [chatProxy]);
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
          <nav class="c-nav-header">
            <a href="/index.html">← Back to search</a>
          </nav>
          <h1>Welcome to HITS Pattern Guide</h1>
        </div>
      )}
    </>
  );
}

render(<App />, document.getElementById("app") as HTMLElement);
