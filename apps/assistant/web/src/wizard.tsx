import type { MessageToFigma, MessageToWeb, RenderAutoLayoutItem, SelectionSummary } from "@h20/assistant-types";
import { useAuth } from "@h20/auth/preact-hooks";
import { getProxyToFigma } from "@h20/figma-tools";
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { abortTask } from "./modules/copilot/abort";
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

  const handleRenderItem = async (request: RenderAutoLayoutItem) => {
    proxyToFigma.notify({ renderAutoLayoutItem: request });
  };

  const clearTextAreaElement = (element?: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.value = "";
  };

  const userMessageTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const assistantMesageTextAreaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <>
      {isConnected === undefined && <ProgressBar />}
      {isConnected === false && <Welcome onSignIn={signIn} />}
      {isConnected === true && (
        <div class="c-module-stack">
          <nav class="c-nav-header">
            <a href="/index.html">← Back to search</a>
          </nav>
          <section class="c-module-stack__section">
            <h2>Utils</h2>
            <menu>
              <button>Show spinner</button>
              <button onClick={() => handleRenderItem({ containerName: "@thread", clear: true })}>Reset chat</button>
            </menu>
          </section>
          <section class="c-module-stack__section">
            <h2>User message</h2>
            <textarea rows={6} ref={userMessageTextAreaRef}></textarea>
            <button
              onClick={() =>
                handleRenderItem({
                  containerName: "@thread",
                  templateName: "@user-message-template",
                  replacements: {
                    content: userMessageTextAreaRef.current?.value ?? "",
                  },
                }).then(() => clearTextAreaElement(userMessageTextAreaRef.current))
              }
            >
              Append
            </button>
          </section>
          <section class="c-module-stack__section">
            <h2>Assistant message</h2>
            <textarea rows={6} ref={assistantMesageTextAreaRef}></textarea>
            <button
              onClick={() =>
                handleRenderItem({
                  containerName: "@thread",
                  templateName: "@assistant-message-template",
                  replacements: {
                    content: assistantMesageTextAreaRef.current?.value ?? "",
                  },
                }).then(() => clearTextAreaElement(assistantMesageTextAreaRef.current))
              }
            >
              Append
            </button>
          </section>
        </div>
      )}
    </>
  );
}

render(<App />, document.getElementById("app") as HTMLElement);
