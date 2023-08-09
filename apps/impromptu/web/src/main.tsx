import { useAuth } from "@h20/auth/preact-hooks";
import type { CompletionInfoItem, LogEntry, MessageToUI, SelectionSummary } from "@impromptu-demo/types";
import { render } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { read, utils } from "xlsx";
import "./main.css";
import { useInvitieCode } from "./modules/account/use-invite-code";
import { notifyFigma } from "./modules/figma/rpc";
import { DraftViewV2 } from "./modules/hits/draft-view";
import { LogEntryView } from "./modules/log/log-entry-view";
import { StickyView } from "./modules/sticky-view/sticky-view";
import { formatLargeNumber } from "./modules/usage/format";
import { useTokenMeter } from "./modules/usage/usage";

function App() {
  const { isConnected, signIn, signOut, accessToken } = useAuth({
    hitsAuthEndpoint: import.meta.env.VITE_HITS_AUTH_ENDPOINT,
    webHost: import.meta.env.VITE_WEB_HOST,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [selectionSummary, setSelectionSummary] = useState<SelectionSummary | null>(null);
  const { increaseTokenCount, costInCents, tokenCount, reset } = useTokenMeter();

  useEffect(() => {
    const handleMainMessage = async (e: MessageEvent) => {
      const message = e.data.pluginMessage as MessageToUI;

      if (message.selectionChanged) {
        setSelectionSummary(message.selectionChanged!);
      }

      if (message.started) {
        setIsRunning(true);
      }
      if (message.stopped) {
        setIsRunning(false);
      }

      if (message.log) {
        const data = message.log.data;
        if ((data as CompletionInfoItem).tokenUsage) {
          increaseTokenCount((data as CompletionInfoItem).tokenUsage);
        }
        setLogEntries((prev) => [message.log!, ...prev].slice(0, 25));
      }
    };

    window.addEventListener("message", handleMainMessage);
    return () => window.removeEventListener("message", handleMainMessage);
  }, []);

  const stickySummaries = useMemo(() => selectionSummary?.stickies ?? [], [selectionSummary]);
  const primaryDataNode = useMemo(() => selectionSummary?.primaryDataNode ?? null, [selectionSummary]);
  const runnableProgramNodeIds = useMemo(() => selectionSummary?.runnableProgramNodeIds ?? [], [selectionSummary]);

  // app init
  useEffect(() => {
    notifyFigma({ webStarted: true });
  }, []);

  useEffect(() => {
    notifyFigma({ hitsConfig: { accessToken } });
  }, [accessToken]);

  const handleStart = useCallback(() => notifyFigma({ start: true }), []);
  const handleStop = useCallback(() => notifyFigma({ stop: true }), []);
  const handleClear = useCallback(() => notifyFigma({ clear: true }), []);
  const handleRunSelection = useCallback(() => notifyFigma({ runSelected: { runnableProgramNodeIds } }), [runnableProgramNodeIds]);
  const handleCreateProgram = useCallback(
    (e: Event) => notifyFigma({ createProgram: (e.target as HTMLElement).closest("[data-program]")!.getAttribute("data-program")! }),
    []
  );
  const handleClearLog = useCallback(() => setLogEntries([]), []);

  const [inviteCode, setInviteCode] = useState("");
  const isInviteCodeValid = useInvitieCode(inviteCode);

  const [importingStatus, setImportingStatus] = useState("");
  // Import UX
  const handleImportFileSelection = useCallback(async (e: Event) => {
    const textFile = ((e.target as HTMLInputElement).files ?? [])[0];

    if (!textFile) return;

    (e.target as HTMLInputElement).value = "";
    setImportingStatus("Parsing...");

    const sheet = read(await textFile.arrayBuffer());
    console.log(sheet);

    const activeSheet = sheet.Sheets[sheet.SheetNames[0]];
    if (!activeSheet) return;

    const rows = utils.sheet_to_json(activeSheet);
    const formattedRows = rows.map((row: any) =>
      Object.entries(row)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")
    );
    console.log("imported", formattedRows);

    setImportingStatus("");

    notifyFigma({ importTextFile: { rows: formattedRows, type: textFile.type } });
  }, []);

  const csvImportButton = useRef<HTMLInputElement>(null);

  return (
    <main>
      {isConnected && (
        <>
          <fieldset>
            <legend>Run</legend>
            <menu>
              {isRunning ? (
                <button onClick={handleStop}>Stop</button>
              ) : runnableProgramNodeIds.length ? (
                <button onClick={handleRunSelection} title="Run select programs or run programs for the selected outputs">
                  Run {runnableProgramNodeIds.length} selected
                </button>
              ) : (
                <button onClick={handleStart}>Start</button>
              )}

              <button
                onClick={handleClear}
                title="Clear all content from the selected outputs. If there is no selection, any output on the current page will be cleared. Lock any sticky to prevent it from being cleared."
              >
                Clear output
              </button>
            </menu>
          </fieldset>
          <fieldset onClick={handleCreateProgram}>
            <legend>Build</legend>
            <menu>
              <button data-program="agent">Agent</button>
              <button data-program="answer">Answer</button>
              <button data-program="arxiv-search">arXiv search</button>
              <button data-program="categorize">Categorize</button>
              <button data-program="chat">Chat</button>
              <button data-program="collect">Collect</button>
              <button data-program="filter">Filter</button>
              <button data-program="join">Join</button>
              <button data-program="relate">Relate</button>
              <button data-program="research-insights">Research Insights</button>
              <button data-program="research-recommendations">Research Recommendations</button>
              <button data-program="sort">Sort</button>
              <button data-program="summarize">Summarize</button>
              <button data-program="template">Template</button>
              <button data-program="theme">Theme</button>
              <button data-program="web-browse">Web browse</button>
              <button data-program="web-search">Web search</button>
            </menu>
          </fieldset>
          <fieldset>
            <legend>Import</legend>
            <menu>
              <button onClick={() => csvImportButton.current?.click()}>Excel</button>
            </menu>
            <input
              style={{ display: "none" }}
              id="import-file"
              type="file"
              accept="text/plain, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onInput={handleImportFileSelection}
              ref={csvImportButton}
            />
            {importingStatus}
          </fieldset>
          <fieldset>
            <legend>Export</legend>
            <DraftViewV2 accessToken={accessToken} primaryDataNode={primaryDataNode} />
          </fieldset>
          <fieldset>
            <legend>Inspect</legend>
            <StickyView stickySummaries={stickySummaries} />
          </fieldset>
          <fieldset>
            <legend>Log</legend>
            <menu>
              <button onClick={handleClearLog}>Clear</button>
            </menu>
            {logEntries.map((entry) => (
              <LogEntryView entry={entry} key={entry.id} />
            ))}
          </fieldset>
        </>
      )}
      <fieldset>
        <legend>Account</legend>
        <menu>
          {isConnected === undefined && <div>Authenticating...</div>}
          {isConnected === true && (
            <>
              <button onClick={signOut}>Sign out</button>
              <button onClick={reset}>Reset usage</button>
            </>
          )}
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
        {isConnected === true && (
          <div>
            Usage: {formatLargeNumber(tokenCount)} tokens{" "}
            <span class="cost-estimate" title="Estimated cost based on Open AI consumer pricing">{`($${(costInCents / 100).toFixed(3)})`}</span>
          </div>
        )}
      </fieldset>
      {isConnected === true && (
        <fieldset>
          <legend>Help</legend>
          <a target="_blank" href="https://www.figma.com/file/DO4WmH5XhvczYeYnC24AXk/Impromptu-User-Guide">
            User guide
          </a>
        </fieldset>
      )}
    </main>
  );
}

document.getElementById("app")!.innerHTML = "";
render(<App />, document.getElementById("app") as HTMLElement);
