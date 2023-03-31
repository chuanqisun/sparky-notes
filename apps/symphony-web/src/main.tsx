import { FigmaProxy, getFigmaProxy } from "@h20/figma-relay";
import { LiveProgram, MessageToFigma, MessageToWeb } from "@symphony/types";
import { render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import "./main.css";
import { useAuth } from "./modules/account/use-auth";
import { useInvitieCode } from "./modules/account/use-invite-code";
import { ChatMessage, getChatResponse, OpenAIChatPayload, OpenAIChatResponse } from "./modules/openai/chat";
import { getCompletion, OpenAICompletionPayload, OpenAICompletionResponse } from "./modules/openai/completion";
import { generateReasonAct } from "./modules/prompts/reason-act-v2";

const figmaProxy = getFigmaProxy<MessageToFigma, MessageToWeb>(import.meta.env.VITE_PLUGIN_ID);

export interface RunContext {
  figmaProxy: FigmaProxy<MessageToFigma, MessageToWeb>;
  getCompletion: (prompt: string, config?: Partial<OpenAICompletionPayload>) => Promise<OpenAICompletionResponse>;
  getChat: (messages: ChatMessage[], config?: Partial<OpenAIChatPayload>) => Promise<OpenAIChatResponse>;
}

function App() {
  const { isConnected, signIn, signOut, accessToken } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const isInviteCodeValid = useInvitieCode(inviteCode);
  const [contextPrograms, setContextPrograms] = useState<LiveProgram[]>([]);

  const runContext = useMemo<RunContext>(
    () => ({
      figmaProxy,
      getCompletion: getCompletion.bind(null, accessToken),
      getChat: getChatResponse.bind(null, accessToken),
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

  const handleCreateNode = useCallback(
    async (subtype: string, fallbackInput: string) => {
      if (!selectedPrograms.length) {
        figmaProxy.request({
          requestCreateProgram: {
            parentIds: [],
            subtype,
            input: fallbackInput,
          },
        });

        return;
      }

      const parentIds = selectedPrograms.map((p) => p.id);
      const { respondUpstreamGraph: respondLinearContextGraph } = await runContext.figmaProxy.request({ requestUpstreamGraph: { leafIds: parentIds } });
      if (!respondLinearContextGraph?.length) return;

      const resultList = await generateReasonAct(runContext, {
        pretext: respondLinearContextGraph.map((program) => `${program.subtype}: ${program.input}`).join("\n"),
        generateStepName: subtype,
      });

      if (!resultList) {
        runContext.figmaProxy.notify({
          showNotification: {
            message: "Nothing came up. Try again or make a change?",
          },
        });
        return;
      }

      for (const item of resultList.listItems) {
        await runContext.figmaProxy.request({
          requestCreateProgram: {
            parentIds,
            subtype,
            input: item,
          },
        });
      }
    },
    [runContext, selectedPrograms]
  );

  const handleCreateSpatialNode = useCallback(
    async (subtype: string, fallbackInput: string) => {
      if (!selectedPrograms.length) {
        figmaProxy.request({
          requestCreateProgram: {
            parentIds: [],
            subtype,
            input: fallbackInput,
          },
        });

        return;
      }

      const parentIds = selectedPrograms.map((p) => p.id);
      const { respondUpstreamGraph: respondLinearContextGraph } = await runContext.figmaProxy.request({ requestUpstreamGraph: { leafIds: parentIds } });
      if (!respondLinearContextGraph?.length) return;

      const resultList = await generateReasonAct(runContext, {
        pretext: respondLinearContextGraph.map((program) => `${program.subtype}: ${program.input}`).join("\n"),
        generateStepName: subtype,
      });

      if (!resultList) {
        runContext.figmaProxy.notify({
          showNotification: {
            message: "Nothing came up. Try again or make a change?",
          },
        });
        return;
      }

      for (const item of resultList.listItems) {
        await runContext.figmaProxy.request({
          requestCreateProgram: {
            parentIds,
            subtype,
            input: item,
          },
        });
      }
    },
    [runContext, selectedPrograms]
  );

  const [navMode, setNavMode] = useState("semiauto");

  return (
    <main>
      {isConnected ? (
        <>
          <fieldset>
            <legend>Navigate</legend>
            <div class="navigator">
              <div class="navigator-mode">
                <label>
                  <input type="radio" name="navmode" value="auto" checked={navMode === "auto"} onInput={() => setNavMode("auto")} />
                  Auto
                </label>
                <label>
                  <input type="radio" name="navmode" value="auto" checked={navMode === "semiauto"} onInput={() => setNavMode("semiauto")} />
                  Copilot
                </label>
                <label>
                  <input type="radio" name="navmode" value="manual" checked={navMode === "manual"} onInput={() => setNavMode("manual")} />
                  Manual
                </label>
              </div>
              {navMode === "auto" && (
                <menu>
                  <button>Start</button>
                </menu>
              )}
              {(navMode === "semiauto" || navMode === "manual") && (
                <div class="navigator-menu">
                  <menu class="top-menu">
                    {navMode === "semiauto" && <button>Explore</button>}
                    {navMode === "manual" && <button onClick={() => handleCreateNode("Thought", "How to tell a story?")}>Thought</button>}
                    {navMode === "manual" && <button onClick={() => handleCreateNode("Action", `Search the web for "Technology Trend"`)}>Action</button>}
                  </menu>
                  <div class="top-link">↓</div>
                  <menu class="left-menu">
                    {navMode === "semiauto" && <button>Explore</button>}
                    {navMode === "manual" && <button onClick={() => handleCreateNode("Thought", "How to tell a story?")}>Thought</button>}
                    {navMode === "manual" && <button onClick={() => handleCreateNode("Action", `Search the web for "Technology Trend"`)}>Action</button>}
                  </menu>
                  <div class="left-link">→</div>
                  <menu class="center-menu">
                    {navMode === "semiauto" && <button>Continue</button>}
                    {navMode === "manual" && <button onClick={() => handleCreateNode("Thought", "How to tell a story?")}>Thought</button>}
                    {navMode === "manual" && <button onClick={() => handleCreateNode("Action", `Search the web for "Technology Trend"`)}>Action</button>}
                    {navMode === "manual" && <button onClick={() => handleCreateNode("Observation", "The Earth revolves around the Sun")}>Observation</button>}
                  </menu>
                  <div class="right-link">→</div>
                  <menu class="right-menu">
                    {navMode === "semiauto" && <button>Explore</button>}
                    {navMode === "manual" && <button onClick={() => handleCreateNode("Thought", "How to tell a story?")}>Thought</button>}
                    {navMode === "manual" && <button onClick={() => handleCreateNode("Action", `Search the web for "Technology Trend"`)}>Action</button>}
                  </menu>
                  <div class="bottom-link">↓</div>
                  <menu class="bottom-menu">
                    {navMode === "semiauto" && <button>Explore</button>}
                    {navMode === "manual" && <button onClick={() => handleCreateNode("Thought", "How to tell a story?")}>Thought</button>}
                    {navMode === "manual" && <button onClick={() => handleCreateNode("Action", `Search the web for "Technology Trend"`)}>Action</button>}
                  </menu>
                </div>
              )}
            </div>
          </fieldset>
          <fieldset>
            <legend>Action tools</legend>
            <ul class="tool-list">
              <li>
                <input type="checkbox" checked={true}></input>Auto tooling
              </li>
              <li>
                <input type="checkbox"></input>HITS search
              </li>
              <li>
                <input type="checkbox"></input>Academic search
              </li>
              <li>
                <input type="checkbox"></input>Wikipedia search
              </li>
              <li>
                <input type="checkbox"></input>Google search
              </li>
              <li>
                <input type="checkbox"></input>Theme extraction
              </li>
              <li>
                <input type="checkbox"></input>Summarization
              </li>
              <li>
                <input type="checkbox"></input>Filter
              </li>
              <li>
                <input type="checkbox"></input>Problem analysis
              </li>
              <li>
                <input type="checkbox"></input>Step-by-step planning
              </li>
            </ul>
          </fieldset>
          <fieldset>
            <legend>Context</legend>
            <ul class="context-list">
              {contextPrograms.map((program) => (
                <li key={program.id} data-selected={program.isSelected}>
                  <b>{program.subtype}</b>: {program.input}{" "}
                </li>
              ))}
            </ul>
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
