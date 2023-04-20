import { FigmaProxy, getFigmaProxy } from "@h20/figma-relay";
import { MessageToFigma, MessageToWeb, OperatorNode } from "@symphony/types";
import { promised } from "jq-web-wasm/jq.wasm";
import { render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import "./main.css";
import { useAuth } from "./modules/account/use-auth";
import { useInvitieCode } from "./modules/account/use-invite-code";
import { InspectorView } from "./modules/inspector/inspector";
import { ChatMessage, OpenAIChatPayloadWithModel, OpenAIChatResponse, getChatResponse, modelToEndpoint } from "./modules/openai/chat";
import { jsonTypeToTs, reflectJsonAst } from "./modules/reflection/json-to-typing";

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
          await new Promise<void>((resolve) => {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.addEventListener("input", async (e) => {
              const maybeTextFile = fileInput.files?.[0];

              // TODO support CSV, Excel
              try {
                const fileContent = (await maybeTextFile?.text()) ?? "";
                runContext.figmaProxy.notify({
                  setOperatorData: {
                    id: operator.id,
                    data: fileContent,
                  },
                });
              } catch (e) {
                console.log(`Error decoding text file`, e);

                runContext.figmaProxy.notify({
                  setOperatorData: {
                    id: operator.id,
                    data: "",
                  },
                });
              } finally {
                resolve();
              }
            });

            fileInput.click();
          });
          break;
        }

        case "NLP Query": {
          // get input data
          const { respondUpstreamOperators } = await runContext.figmaProxy.request({ requestUpstreamOperators: { currentOperatorId: operator.id } });

          if (!respondUpstreamOperators?.length) return;
          // current only current one parent
          const parentData = respondUpstreamOperators[0].data;

          const fileObject = JSON.parse(parentData);
          const ast = reflectJsonAst(fileObject);
          const ts = jsonTypeToTs(ast);

          const messages: ChatMessage[] = [
            {
              role: "system",
              content: `
You are an expert in json. You are helping the user design a jq query. The input is an array of objects of the following typing
\`\`\`typescript
${ts}
\`\`\`

The user will provide a query goal, and you respond with the jq query. Use this format:

Reason: <Analyze user goal against object type>
jq: \`<The jq string>\``,
            },
            {
              role: "user",
              content: JSON.parse(operator.config).query,
            },
          ];

          const responseText = (await runContext.getChat(messages, { temperature: 0, model: "v4-8k" })).choices[0].message.content ?? "";

          const jqString = responseText.match(/^jq\:\s*`(.+?)`/m)?.[1] ?? "";
          const normalizedTarget = jqString.startsWith(".[]") ? (Array.isArray(fileObject) ? fileObject : [fileObject]) : fileObject;
          if (jqString) {
            console.log({
              jq: jqString,
              input: normalizedTarget,
            });
            const result = await promised.json(normalizedTarget, jqString);
            console.log({
              jq: jqString,
              output: result,
            });

            runContext.figmaProxy.notify({
              setOperatorData: {
                id: operator.id,
                data: JSON.stringify(result),
              },
            });
          }
          break;
        }
      }

      runContext.figmaProxy.notify({ showNotification: { message: `✅ Done` } });
    }
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
              <button onClick={() => handleCreateNode("File", "{}", "")}>File</button>
              <button onClick={() => handleCreateNode("NLP Query", `{"query": "First 10 chat messages"}`, "")}>NLP query</button>
              <button onClick={() => {}}>Filter</button>
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
