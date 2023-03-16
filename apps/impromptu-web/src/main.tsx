import { MessageToUI } from "@impromptu/types";
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { LogEntry } from "../../impromptu-plugin/src/utils/logger";
import "./main.css";
import { useAuth } from "./modules/account/use-auth";
import { useInvitieCode } from "./modules/account/use-invite-code";
import { notifyFigma } from "./modules/figma/rpc";
import { LogEntryView } from "./modules/log/log-entry-view";

function App() {
  const { isConnected, signIn, signOut, accessToken } = useAuth();

  const [isRunning, setIsRunning] = useState(false);

  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    const handleMainMessage = async (e: MessageEvent) => {
      const message = e.data.pluginMessage as MessageToUI;

      if (message.started) {
        setIsRunning(true);
      }
      if (message.stopped) {
        setIsRunning(false);
      }

      if (message.log) {
        setLogEntries((prev) => [message.log!, ...prev].slice(0, 25));
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
  const handleClearLog = useCallback(() => setLogEntries([]), []);

  const [inviteCode, setInviteCode] = useState("");
  const isInviteCodeValid = useInvitieCode(inviteCode);

  return (
    <main>
      {isConnected && (
        <>
          <fieldset>
            <legend>Run</legend>
            <menu>
              {isRunning ? <button onClick={handleStop}>Stop</button> : <button onClick={handleStart}>Start</button>}
              <button onClick={handleClear}>Clear</button>
            </menu>
          </fieldset>
          <fieldset onClick={handleCreateProgram}>
            <legend>Build</legend>
            <menu>
              <button data-program="agent">Agent</button>
              <button data-program="answer">Answer</button>
              <button data-program="categorize">Categorize</button>
              <button data-program="completion">Completion</button>
              <button data-program="filter">Filter</button>
              <button data-program="relate">Relate</button>
              <button data-program="research-insights"> Research Insights</button>
              <button data-program="research-recommendations"> Research Recommendations</button>
              <button data-program="sort">Sort</button>
              <button data-program="summarize">Summarize</button>
              <button data-program="web-browse">Web browse</button>
              <button data-program="web-search">Web search</button>
            </menu>
          </fieldset>
        </>
      )}
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
      {isConnected && (
        <fieldset>
          <legend>Log</legend>
          <menu>
            <button onClick={handleClearLog}>Clear</button>
          </menu>
          {logEntries.map((entry) => (
            <LogEntryView entry={entry} key={entry.id} />
          ))}
        </fieldset>
      )}
    </main>
  );
}

document.getElementById("app")!.innerHTML = "";
render(<App />, document.getElementById("app") as HTMLElement);
