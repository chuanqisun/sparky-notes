import { getFigmaProxy } from "@h20/figma-relay";
import { MessageToFigma, MessageToUI } from "@symphony/types";
import { render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import "./main.css";
import { useAuth } from "./modules/account/use-auth";
import { useInvitieCode } from "./modules/account/use-invite-code";
import { getCompletion } from "./modules/openai/completion";

const figmaProxy = getFigmaProxy<MessageToFigma, MessageToUI>(import.meta.env.VITE_PLUGIN_ID);

function App() {
  const { isConnected, signIn, signOut, accessToken } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const isInviteCodeValid = useInvitieCode(inviteCode);

  const runContext = useMemo(
    () => ({
      getCompletion: getCompletion.bind(null, accessToken),
    }),
    [accessToken]
  );

  const [selectionName, setSelectionName] = useState("");
  useEffect(() => {
    const handleMainMessage = async (e: MessageEvent) => {
      const message = e.data.pluginMessage as MessageToUI;
      if (message.graphSelection) {
        setSelectionName(message.graphSelection!.nodeName);
      }
    };

    window.addEventListener("message", handleMainMessage);
    return () => window.removeEventListener("message", handleMainMessage);
  }, []);

  useEffect(() => figmaProxy.notify({ requestGraphSelection: true }), []);

  const handleRun = useCallback(async () => {
    const { respondSelectedPrograms } = await figmaProxy.request({ requestSelectedPrograms: true });
    const activeProgram = respondSelectedPrograms![0];
    if (!activeProgram) return;
    // todo run selected program
    const partialList = await runContext.getCompletion(`Goal: ${activeProgram.input}\nSteps:\n1. `);
  }, [runContext]);

  return (
    <main>
      {isConnected ? (
        <>
          <fieldset>
            <legend>Current node</legend>
            <div>{selectionName}</div>
          </fieldset>
          <fieldset>
            <legend>Menu</legend>
            <menu>
              <button onClick={() => figmaProxy.notify({ requestCreateProgramNode: true })}>New</button>
              <button onClick={handleRun}>Run</button>
            </menu>
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
