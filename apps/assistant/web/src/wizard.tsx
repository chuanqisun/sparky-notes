import type { MessageToFigma, MessageToWeb, RenderAutoLayoutItem, SearchNodeResult, SelectionSummary } from "@h20/assistant-types";
import { useAuth } from "@h20/auth/preact-hooks";
import { getProxyToFigma } from "@h20/figma-tools";
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { abortTask } from "./modules/copilot/abort";
import { appInsights } from "./modules/telemetry/app-insights";
import { ProgressBar } from "./styles/components/progress-bar";
import { Welcome } from "./styles/components/welcome";

const proxyToFigma = getProxyToFigma<MessageToFigma, MessageToWeb>(import.meta.env.VITE_PLUGIN_ID);

// remove loading placeholder
document.getElementById("app")!.innerHTML = "";
window.focus();

appInsights.trackPageView();

interface TemplateLibrary {
  threadTemplate?: SearchNodeResult | null;
  userMessageTemplate?: SearchNodeResult | null;
  spinnerTemplate?: SearchNodeResult | null;
  assistantMessageTemplates: (SearchNodeResult & { displayName: string })[];
}

function App() {
  const { isConnected, signIn, accessToken } = useAuth({
    serverHost: import.meta.env.VITE_H20_SERVER_HOST,
  });

  const [selection, setSelection] = useState<SelectionSummary | null>(null);
  const [templateLibrary, setTemplateLibrary] = useState<TemplateLibrary>({ assistantMessageTemplates: [] });

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

    handleLoadTemplates();
  }, []);

  const handleLoadTemplates = async () => {
    const { searchNodesByNamePattern } = await proxyToFigma.request({
      searchNodesByNamePattern: String.raw`@(assistant-message-template\/.+)|(thread)|(user-message-template)|(spinner-template)`,
    });
    if (!searchNodesByNamePattern) return;

    setTemplateLibrary((prev) => ({
      ...prev,
      threadTemplate: searchNodesByNamePattern.find((p) => p.name === "@thread") ?? null,
      userMessageTemplate: searchNodesByNamePattern.find((p) => p.name === "@user-message-template") ?? null,
      spinnerTemplate: searchNodesByNamePattern.find((p) => p.name === "@spinner-template") ?? null,
      assistantMessageTemplates: searchNodesByNamePattern
        .filter((p) => p.name.startsWith("@assistant-message-template/"))
        .map((p) => ({
          ...p,
          displayName: p.name.replace("@assistant-message-template/", ""),
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    }));
  };

  const handleRenderItem = async (request: RenderAutoLayoutItem) => {
    proxyToFigma.notify({ renderAutoLayoutItem: request });
  };

  const handleZoomNodeIntoView = async (names: string[]) => {
    proxyToFigma.notify({ zoomIntoViewByNames: names });
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
              <button onClick={() => handleLoadTemplates()}>Load templates</button>
              <button onClick={() => handleRenderItem({ containerName: "@thread", clear: true })}>Reset chat</button>
            </menu>
          </section>
          <section class="c-module-stack__section">
            <h2>User message</h2>
            <textarea rows={6} ref={userMessageTextAreaRef}></textarea>
            <menu>
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
              <button
                onClick={() =>
                  handleRenderItem({
                    containerName: "@thread",
                    templateName: "@spinner-template",
                    clear: "@spinner-instance",
                  })
                }
              >
                Show spinner
              </button>
            </menu>
          </section>
          <section class="c-module-stack__section">
            <h2>Assistant message</h2>
            {templateLibrary.assistantMessageTemplates.map((template) => (
              <button
                onClick={() =>
                  handleRenderItem({
                    containerName: "@thread",
                    templateName: template.name,
                    clear: "@spinner-instance",
                  })
                }
              >
                {template.displayName}
              </button>
            ))}
            <details>
              <summary>Custom</summary>
              <div class="c-module-stack__section c-module-stack__no-padding">
                <textarea rows={6} ref={assistantMesageTextAreaRef}></textarea>
                <button
                  onClick={() =>
                    handleRenderItem({
                      containerName: "@thread",
                      templateName: "@assistant-message-template",
                      clear: "@spinner-instance",
                      replacements: {
                        content: assistantMesageTextAreaRef.current?.value ?? "",
                      },
                    }).then(() => clearTextAreaElement(assistantMesageTextAreaRef.current))
                  }
                >
                  Append
                </button>
              </div>
            </details>
          </section>

          <section class="c-module-stack__section">
            <h2>Special components</h2>
            <table>
              <tr>
                <td>{templateLibrary.threadTemplate ? "✅" : "⚠️"}</td>
                <td>
                  {templateLibrary.threadTemplate ? (
                    <a href="#" onClick={() => handleZoomNodeIntoView([templateLibrary.threadTemplate!.name])}>
                      ❖@thread
                    </a>
                  ) : (
                    <span>❖@thread</span>
                  )}{" "}
                </td>
              </tr>
              <tr>
                <td>{templateLibrary.userMessageTemplate ? "✅" : "⚠️"}</td>
                <td>
                  {templateLibrary.userMessageTemplate ? (
                    <a href="#" onClick={() => handleZoomNodeIntoView([templateLibrary.userMessageTemplate!.name])}>
                      ❖@user-message-template
                    </a>
                  ) : (
                    <span>❖@user-message-template</span>
                  )}
                </td>
              </tr>
              <tr>
                <td>{templateLibrary.assistantMessageTemplates?.length ? "✅" : "⚠️"}</td>
                <td>{`❖@assistant-message-template/<name>`}</td>
              </tr>
              <tr>
                <td>{templateLibrary.spinnerTemplate ? "✅" : "⚠️"}</td>
                <td>❖@spinner-template</td>
              </tr>
            </table>
          </section>
        </div>
      )}
    </>
  );
}

render(<App />, document.getElementById("app") as HTMLElement);
