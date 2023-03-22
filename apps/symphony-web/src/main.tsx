import { getFigmaProxy } from "@h20/figma-relay";
import { MessageToFigma, MessageToWeb, SelectedProgram } from "@symphony/types";
import { render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import "./main.css";
import { useAuth } from "./modules/account/use-auth";
import { useInvitieCode } from "./modules/account/use-invite-code";
import { getCompletion } from "./modules/openai/completion";
import { responseToArray } from "./modules/openai/format";

const figmaProxy = getFigmaProxy<MessageToFigma, MessageToWeb>(import.meta.env.VITE_PLUGIN_ID);

function App() {
  const { isConnected, signIn, signOut, accessToken } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const isInviteCodeValid = useInvitieCode(inviteCode);
  const [selectedPrograms, setSelectedPrograms] = useState<SelectedProgram[]>([]);

  const runContext = useMemo(
    () => ({
      getCompletion: getCompletion.bind(null, accessToken),
    }),
    [accessToken]
  );

  useEffect(() => {
    const handleMainMessage = async (e: MessageEvent) => {
      const message = e.data.pluginMessage as MessageToWeb;

      if (message.programSelectionChanged) {
        setSelectedPrograms(message.programSelectionChanged);
      }
    };

    window.addEventListener("message", handleMainMessage);
    return () => window.removeEventListener("message", handleMainMessage);
  }, []);

  const summarizeContext = async (targetNodeId: string) => {
    await figmaProxy.request({ requestContext: targetNodeId });
  };

  const handleAnalyze = useCallback(async () => {
    const activeProgram = selectedPrograms[0];
    if (!activeProgram) return;

    figmaProxy.notify({ requestRemoveDownstreamNode: activeProgram.id });

    if (activeProgram.subtype === "Question") {
      const partialList = await runContext.getCompletion(
        `
Make a step-by-step plan to answer the following question. 
Question: "${activeProgram.input}"
Step by step plan (one line per step): `,
        { max_tokens: 200 }
      );

      const steps = responseToArray(partialList.choices[0].text);
      figmaProxy.request({
        requestCreateSerialTaskNodes: {
          parentId: activeProgram.id,
          taskDescriptions: steps,
        },
      });
    } else if (activeProgram.subtype === "Task") {
      const partialList = await runContext.getCompletion(
        `
Make a step-by-step plan to carry out the following task
Task: "${activeProgram.input}"
Step by step plan (one line per step): `,
        { max_tokens: 200 }
      );

      const steps = responseToArray(partialList.choices[0].text);
      figmaProxy.request({
        requestCreateSerialTaskNodes: {
          parentId: activeProgram.id,
          taskDescriptions: steps,
        },
      });
    }
  }, [runContext, selectedPrograms]);

  const handleRun = useCallback(async () => {
    const activeProgram = selectedPrograms[0];
    if (!activeProgram) return;
    // todo run selected program
    const partialList = await runContext.getCompletion(`
Make a plan to accomplish the following goal.
Goal: "${activeProgram.input}"
Plan: `);
  }, [runContext, selectedPrograms]);

  return (
    <main>
      {isConnected ? (
        <>
          <fieldset>
            <legend>Menu</legend>
            <menu>
              <button onClick={() => figmaProxy.notify({ requestCreateProgramNode: true })}>Add question</button>
              <button>Add task</button>
              <button onClick={handleAnalyze} disabled={!selectedPrograms.length}>
                Analyze
              </button>
              <button onClick={handleRun} disabled={!selectedPrograms.some((program) => program.subtype === "Task")}>
                Run
              </button>
            </menu>
          </fieldset>
          <fieldset>
            <legend>Context</legend>
            <ul>
              {selectedPrograms.map((program) => (
                <li key={program.id}>
                  {program.subtype}: {program.input}{" "}
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
