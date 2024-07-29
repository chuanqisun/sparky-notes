import type { MessageToFigma, MessageToWeb, RenderAutoLayoutItem, SearchNodeResult, SelectionSummary } from "@h20/assistant-types";
import { useAuth } from "@h20/auth/preact-hooks";
import { getProxyToFigma } from "@h20/figma-tools";
import { render } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
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
  threadTemplates: SearchNodeResult[];
  userTemplates: SearchNodeResult[];
  spinnerTemplates: SearchNodeResult[];
  copilotTemplates: (SearchNodeResult & { displayName: string })[];
}

function App() {
  const { isConnected, signIn, accessToken } = useAuth({
    serverHost: import.meta.env.VITE_H20_SERVER_HOST,
  });

  const [selection, setSelection] = useState<SelectionSummary | null>(null);
  const [templateLibrary, setTemplateLibrary] = useState<TemplateLibrary>({
    copilotTemplates: [],
    threadTemplates: [],
    userTemplates: [],
    spinnerTemplates: [],
  });

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
      searchNodesByNamePattern: String.raw`@(copilot-template\/.+)|(thread)|(user-template)|(spinner-template)`,
    });
    if (!searchNodesByNamePattern) return;

    setTemplateLibrary((prev) => ({
      ...prev,
      threadTemplates: searchNodesByNamePattern.filter((p) => p.name === "@thread"),
      userTemplates: searchNodesByNamePattern.filter((p) => p.name === "@user-template"),
      spinnerTemplates: searchNodesByNamePattern.filter((p) => p.name === "@spinner-template"),
      copilotTemplates: searchNodesByNamePattern
        .filter((p) => p.name.startsWith("@copilot-template/"))
        .map((p) => ({
          ...p,
          displayName: p.name.replace("@copilot-template/", ""),
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

  const handleLocateNodeByNames = useCallback((names: string[]) => {
    handleLoadTemplates();
    handleZoomNodeIntoView(names);
  }, []);

  const userMessageTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const copilotMessageVariableValueRef = useRef<HTMLTextAreaElement>(null);

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
            <header class="c-split-header">
              <h2>Thread</h2>
              <span>
                {templateLibrary.threadTemplates?.length ? (
                  <a
                    href="javascript:void(0)"
                    onClick={() => handleLocateNodeByNames(templateLibrary.threadTemplates.map((t) => t.name))}
                    title="Click to locate"
                  >
                    ❖@thread
                  </a>
                ) : (
                  <a
                    href="javascript:void(0)"
                    onClick={() => handleLocateNodeByNames(templateLibrary.threadTemplates.map((t) => t.name))}
                    title={`Component or Frame named "@thread" not found. Click to re-scan`}
                  >
                    ❖@thread ⚠️
                  </a>
                )}
              </span>
            </header>
            <button onClick={() => handleRenderItem({ containerName: "@thread", clear: true })}>Clear</button>
          </section>
          <section class="c-module-stack__section">
            <header class="c-split-header">
              <h2>User message</h2>
              <span>
                {templateLibrary.userTemplates ? (
                  <a
                    href="javascript:void(0)"
                    onClick={() => handleLocateNodeByNames(templateLibrary.userTemplates.map((t) => t.name))}
                    title="Click to locate"
                  >
                    ❖@user-template
                  </a>
                ) : (
                  <a
                    href="javascript:void(0)"
                    onClick={() => handleLocateNodeByNames(templateLibrary.userTemplates.map((t) => t.name))}
                    title={`Component or Frame named "@user-template" not found. Click to re-scan`}
                  >
                    ❖@user-template ⚠️
                  </a>
                )}
              </span>
            </header>
            <textarea rows={6} ref={userMessageTextAreaRef}></textarea>
            <button
              onClick={() =>
                handleRenderItem({
                  containerName: "@thread",
                  templateName: "@user-template",
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
            <header class="c-split-header">
              <h2>Spinner</h2>
              <span>
                {templateLibrary.spinnerTemplates.length ? (
                  <a
                    href="javascript:void(0)"
                    onClick={() => handleLocateNodeByNames(templateLibrary.spinnerTemplates.map((t) => t.name))}
                    title="Click to locate"
                  >
                    ❖@spinner-template
                  </a>
                ) : (
                  <a
                    href="javascript:void(0)"
                    onClick={() => handleLocateNodeByNames(templateLibrary.spinnerTemplates.map((t) => t.name))}
                    title={`Component or Frame named "@spinner-template" not found. Click to re-scan`}
                  >
                    ❖@spinner-template ⚠️
                  </a>
                )}
              </span>
            </header>
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
          </section>

          <section class="c-module-stack__section">
            <div class="c-split-header">
              <h2>Copilot message</h2>
              <span>
                {templateLibrary.copilotTemplates.length ? (
                  <a
                    href="javascript:void(0)"
                    onClick={() => handleLocateNodeByNames(templateLibrary.copilotTemplates.map((t) => t.name))}
                    title="Click to locate"
                  >
                    ❖@copilot-template/*
                  </a>
                ) : (
                  <a
                    href="javascript:void(0)"
                    onClick={() => handleLocateNodeByNames(templateLibrary.copilotTemplates.map((t) => t.name))}
                    title={`Components or Frames named "@copilot-template/<replace_with_real_name>" not found. Click to re-scan`}
                  >
                    ❖@copilot-template/* ⚠️
                  </a>
                )}
              </span>
            </div>
            {templateLibrary.copilotTemplates.map((template) => (
              <button
                onClick={() =>
                  handleRenderItem({
                    containerName: "@thread",
                    templateName: template.name,
                    clear: "@spinner-instance",
                    replacements: {
                      content: copilotMessageVariableValueRef.current?.value ?? "",
                    },
                  }).then(() => clearTextAreaElement(copilotMessageVariableValueRef.current))
                }
              >
                {template.displayName}
              </button>
            ))}
            <details open>
              <summary>Variable value</summary>
              <div class="c-module-stack__section c-module-stack__no-padding">
                <textarea
                  rows={6}
                  ref={copilotMessageVariableValueRef}
                  placeholder="Enter any text to replace the {{content}} string in the Copilot message template."
                ></textarea>
              </div>
            </details>
          </section>
        </div>
      )}
    </>
  );
}

render(<App />, document.getElementById("app") as HTMLElement);
