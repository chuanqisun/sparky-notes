import { MessageToUI } from "@impromptu/types";
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import "./main.css";
import { useAuth } from "./modules/account/use-auth";
import { useInvitieCode } from "./modules/account/use-invite-code";
import { notifyFigma } from "./modules/figma/rpc";

function App() {
  const { isConnected, signIn, signOut, accessToken } = useAuth();

  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const handleMainMessage = async (e: MessageEvent) => {
      const message = e.data.pluginMessage as MessageToUI;

      if (message.started) {
        setIsRunning(true);
      }
      if (message.stopped) {
        setIsRunning(false);
      }
    };

    window.addEventListener("message", handleMainMessage);
    return () => window.removeEventListener("message", handleMainMessage);
  }, []);

  useEffect(() => {
    notifyFigma({ hitsConfig: { accessToken } });
  }, [accessToken]);

  const handleStart = useCallback(() => notifyFigma({ start: true }), []);
  const handleStop = useCallback(() => notifyFigma({ stop: true }), []);
  const handleClear = useCallback(() => notifyFigma({ clear: true }), []);
  const handleCreateProgram = useCallback(
    (e: Event) => notifyFigma({ createProgram: (e.target as HTMLElement).closest("[data-program]")!.getAttribute("data-program")! }),
    []
  );

  const [inviteCode, setInviteCode] = useState("");
  const isInviteCodeValid = useInvitieCode(inviteCode);

  return (
    <main>
      {isConnected && (
        <>
          <fieldset>
            <legend>Run</legend>
            {isRunning ? <button onClick={handleStop}>Stop</button> : <button onClick={handleStart}>Start</button>}
            <button onClick={handleClear}>Clear</button>
          </fieldset>
          <fieldset onClick={handleCreateProgram}>
            <legend>Build</legend>
            <button data-program="prompt">Prompt</button>
            <button data-program="completion">Completion</button>
            <button data-program="answer">Answer</button>
            <button data-program="filter">Filter</button>
            <button data-program="categorize">Categorize</button>
            <button data-program="sort">Sort</button>
            <button data-program="summarize">Summarize</button>
            <button data-program="web-search">Web search</button>
            <button data-program="research-insights"> Research Insights</button>
            <button data-program="research-recommendations"> Research Recommendations</button>
          </fieldset>
        </>
      )}
      <fieldset>
        <legend>Account</legend>
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
      </fieldset>
    </main>
  );
}

document.getElementById("app")!.innerHTML = "";
render(<App />, document.getElementById("app") as HTMLElement);
