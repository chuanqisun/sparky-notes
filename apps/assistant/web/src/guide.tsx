import type { MessageToFigma, MessageToWeb, SelectionSummary } from "@h20/assistant-types";
import { useAuth } from "@h20/auth/preact-hooks";
import { getProxyToFigma } from "@h20/figma-tools";
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
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
  });

  const { chatCompletions } = useMaxProxy({ accessToken });

  const [selection, setSelection] = useState<SelectionSummary | null>(null);

  const [results, setResults] = useState<{ name: string; items: { name: string; purpose: string }[] }[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const handleScan = useCallback(async () => {
    setError(null);
    setResults([]);
    if (!selection) return;

    const { exportedNodeResponse } = await proxyToFigma.request({
      exportNode: {
        id: selection.contentNodes[0].id,
      },
    });

    if (!exportedNodeResponse) return;
    if (exportedNodeResponse.format !== "PNG") return;

    const buffer = exportedNodeResponse.buffer;
    const blob = new Blob([buffer], { type: "image/png" });
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    console.log({ dataUrl });

    const response = await chatCompletions(
      {
        max_tokens: 1000,
        temperature: 0,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: `
Identify UI controls and patterns used in this UI. For each finding, provide the name of the pattern/control and a one-sentence description of its purpose in the context of the UI.
If there are more than 10 findings, choose the top 10 that are cirtical to the function of the UI.


Respond JSON string that satisfies this type:
"""
{
  findings: { name: string, type: "pattern" | "control", purpose: string }[],
}
"""

            `,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: dataUrl,
                  detail: "low",
                },
              },
            ],
          },
        ],
      },
      {
        models: ["gpt-4o"],
      }
    )
      .then((res) => {
        const parsed = JSON.parse(res.choices[0].message!.content ?? "");
        if (!Array.isArray(parsed?.findings)) {
          throw new Error("Invalid response format");
        }

        if (!(parsed.findings as any[]).every((finding) => typeof finding.name === "string" && typeof finding.purpose === "string")) {
          throw new Error("Invalid response format");
        }

        const groups = (parsed.findings as { name: string; type: "pattern" | "control"; purpose: string }[]).reduce((acc, finding) => {
          const group = acc.find((g) => g.name === finding.type);
          if (group) {
            group.items.push({ name: finding.name, purpose: finding.purpose });
          } else {
            acc.push({ name: finding.type, items: [{ name: finding.name, purpose: finding.purpose }] });
          }
          return acc;
        }, [] as { name: string; items: { name: string; purpose: string }[] }[]);

        setResults(groups);
      })
      .catch((error) => {
        setError(error.message);
      });

    console.log({ response });
  }, [selection, chatCompletions]);

  return (
    <>
      {isConnected === undefined && <ProgressBar />}
      {isConnected === false && <Welcome onSignIn={signIn} />}
      {isConnected === true && (
        <div class="c-module-stack">
          <nav class="c-nav-header">
            <a href="/index.html">← Back to search</a>
          </nav>
          <div class="c-list">
            <button onClick={handleScan}>Scan</button>
          </div>
          <div class="c-module-stack__scroll c-list c-scan-results" style="--list-gap: 8px">
            {error ? (
              <p>⚠️ {error}</p>
            ) : (
              results.map((group) => (
                <div class="c-list" style="--list-gap: 4px">
                  <h2 class="u-uppercase">{group.name}</h2>
                  <div class="c-list" style="--list-gap: 4px">
                    {group.items.map((item, index) => (
                      <div key={index}>
                        <b>{item.name}</b>: {item.purpose}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}

render(<App />, document.getElementById("app") as HTMLElement);
