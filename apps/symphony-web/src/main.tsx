import { FigmaProxy, getFigmaProxy } from "@h20/figma-relay";
import { MessageToFigma, MessageToWeb, OperatorNode } from "@symphony/types";
import { render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import "./main.css";
import { useAuth } from "./modules/account/use-auth";
import { useInvitieCode } from "./modules/account/use-invite-code";
import { InspectorView } from "./modules/inspector/inspector";
import { onRunFile } from "./modules/nodes/file";
import { onRunSemanticQuery } from "./modules/nodes/jq-semantic";
import { onRunStructuredQuery } from "./modules/nodes/jq-structured";
import { ChatMessage, OpenAIChatPayloadWithModel, OpenAIChatResponse, getChatResponse, modelToEndpoint } from "./modules/openai/chat";

const figmaProxy = getFigmaProxy<MessageToFigma, MessageToWeb>(import.meta.env.VITE_PLUGIN_ID);

export interface RunContext {
  figmaProxy: FigmaProxy<MessageToFigma, MessageToWeb>;
  getChat: (messages: ChatMessage[], config?: Partial<OpenAIChatPayloadWithModel>) => Promise<OpenAIChatResponse>;
}

function App() {
  const { isConnected, signIn, signOut, accessToken } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const isInviteCodeValid = useInvitieCode(inviteCode);
  const [contextGraph, setContextGraph] = useState<OperatorNode[]>([]);

  const runContext = useMemo<RunContext>(
    () => ({
      figmaProxy,
      getChat: (message, config) => getChatResponse(accessToken, modelToEndpoint(config?.model), message, config),
    }),
    [accessToken]
  );

  useEffect(() => {
    const handleMainMessage = async (e: MessageEvent) => {
      const message = e.data.pluginMessage as MessageToWeb;

      if (message.upstreamGraphChanged) {
        setContextGraph(message.upstreamGraphChanged);
      }
    };

    window.addEventListener("message", handleMainMessage);
    return () => window.removeEventListener("message", handleMainMessage);
  }, []);

  const selectedOperators = useMemo(() => contextGraph.filter((operator) => operator.isSelected), [contextGraph]);

  // request initial selection
  useEffect(() => {
    figmaProxy.notify({ webClientStarted: true });
  }, []);

  const handleCreateNode = useCallback(
    (name: string, config: string, data: string) => {
      figmaProxy.notify({
        createDebugOperator: {
          parentIds: selectedOperators.map((operator) => operator.id),
          name,
          config,
          data,
        },
      });
    },
    [runContext, selectedOperators]
  );

  const handleRunNode = useCallback(async () => {
    for (const operator of selectedOperators) {
      runContext.figmaProxy.notify({ showNotification: { message: `Running ${operator.name}` } });

      switch (operator.name) {
        case "File": {
          await onRunFile(runContext, operator);
          break;
        }

        case "Structured query": {
          await onRunStructuredQuery(runContext, operator);
          break;
        }

        case "Semantic query": {
          await onRunSemanticQuery(runContext, operator);
          break;
        }

        default: {
          break;
        }
      }
    }
    runContext.figmaProxy.notify({ showNotification: { message: `✅ Done` } });
  }, [runContext, selectedOperators]);

  return (
    <main>
      {isConnected ? (
        <>
          <fieldset>
            <legend>Run</legend>
            <menu>
              <button onClick={handleRunNode}>Run</button>
            </menu>
          </fieldset>
          <fieldset>
            <legend>Add</legend>
            <menu>
              <button onClick={() => handleCreateNode("File", "", "")}>File</button>
              <button onClick={() => handleCreateNode("Structured query", `First 10 messages`, "")}>Structured query</button>
              <button onClick={() => handleCreateNode("Semantic query", `Summarize`, "")}>Semantic query</button>
              <button onClick={() => {}}>Reject</button>
              <button onClick={() => {}}>Categorize Open</button>
              <button onClick={() => {}}>Categorize Closed</button>
            </menu>
          </fieldset>
          <fieldset>
            <legend>Inspector</legend>
            <InspectorView operators={selectedOperators} />
          </fieldset>
          <fieldset>
            <legend>Context</legend>
            <div>
              {contextGraph.map((program) => (
                <div key={program.id} data-selected={program.isSelected}>
                  {program.isSelected ? "*" : ""}
                  {program.name} ({program.id})
                </div>
              ))}
            </div>
          </fieldset>
        </>
      ) : null}
      <fieldset>
        <legend>Account</legend>
        <menu>
          {isConnected === undefined && <button disabled>Authenticating...</button>}
          {isConnected === true && <button onClick={signOut}>Sign out</button>}
          {isConnected === false && (
            <>
              <input
                ref={(e) => e?.focus()}
                style={{ width: 80 }}
                type="password"
                placeholder="Invite code"
                name="invite-code"
                onInput={(e) => setInviteCode((e.target as HTMLInputElement).value)}
              />
              <button onClick={signIn} disabled={!isInviteCodeValid}>
                Sign in
              </button>
            </>
          )}
        </menu>
      </fieldset>
    </main>
  );
}

document.getElementById("app")!.innerHTML = "";
render(<App />, document.getElementById("app") as HTMLElement);
