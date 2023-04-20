import { FigmaProxy, getFigmaProxy } from "@h20/figma-relay";
import { LiveProgram, MessageToFigma, MessageToWeb } from "@symphony/types";
import { render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import "./main.css";
import { useAuth } from "./modules/account/use-auth";
import { useInvitieCode } from "./modules/account/use-invite-code";
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
  const [contextPrograms, setContextPrograms] = useState<LiveProgram[]>([]);

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
        setContextPrograms(message.upstreamGraphChanged);
      }
    };

    window.addEventListener("message", handleMainMessage);
    return () => window.removeEventListener("message", handleMainMessage);
  }, []);

  const selectedPrograms = useMemo(() => contextPrograms.filter((program) => program.isSelected), [contextPrograms]);

  // request initial selection
  useEffect(() => {
    figmaProxy.notify({ webClientStarted: true });
  }, []);

  const handleCreateNode = useCallback(() => {
    figmaProxy.notify({
      notifyCreateDebugOperator: {
        name: "fileUpload",
        config: {},
        data: [],
      },
    });
  }, [runContext, selectedPrograms]);

  const handleRunNode = useCallback(() => {}, []);

  return (
    <main>
      {isConnected ? (
        <>
          <fieldset>
            <legend>Run</legend>
            <menu>
              <button onClick={handleCreateNode}>Run</button>
            </menu>
          </fieldset>
          <fieldset>
            <legend>Create</legend>
            <menu>
              <button onClick={handleCreateNode}>File upload</button>
            </menu>
          </fieldset>
          <fieldset>
            <legend>Context</legend>
            <div>
              {contextPrograms.map((program) => (
                <div key={program.id}>{program.input}</div>
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
