import { useCallback, useState } from "preact/hooks";
import type { NotebookAppContext } from "../notebook";
import "./notebook.css";
import { analyzeStep } from "./prompts/analyze-step";
import type { Step } from "./prompts/tool-v2";
import { useDraftStep } from "./use-draft-step";

export interface NotebookProps {
  appContext: NotebookAppContext;
}

export interface NotebookCell {
  id: string;
  stepSource: string;
  stepDefinition: Step | null;
  title?: string;
  input?: string;
}

export function Notebook(props: NotebookProps) {
  const [cells, setCells] = useState<NotebookCell[]>([]);

  const handleSubmitDraftStep = useCallback(
    async (text: string) => {
      const step = await analyzeStep(
        props.appContext,
        { stepDescription: text, previousSteps: cells.filter((cell) => cell.stepDefinition).map((cell) => cell.stepDefinition!) },
        { model: "v4-8k" }
      );
      console.log("step analyzed", step);
      if (step?.chosenTool) {
        setCells((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            stepSource: `${step.chosenTool}(${JSON.stringify(step.toolInput)})`,
            title: step.name,
            stepDefinition: step,
          },
        ]);
      } else if (step) {
        setCells((prev) => [...prev, { id: crypto.randomUUID(), stepSource: text, title: step.name, stepDefinition: step }]);
      } else {
        setCells((prev) => [...prev, { id: crypto.randomUUID(), stepSource: text, title: "Error creating step", stepDefinition: null }]);
      }
    },
    [props.appContext, cells]
  );

  const deleteCell = useCallback((id: string) => setCells((prev) => prev.filter((cell) => cell.id !== id)), []);
  const deleteAllCells = useCallback(() => setCells([]), []);

  const updateCell = useCallback(
    (id: string, update: Partial<NotebookCell>) => setCells((prev) => prev.map((cell) => (cell.id === id ? { ...cell, ...update } : cell))),
    []
  );

  const handleStepChange = useCallback((id: string, step: string) => updateCell(id, { stepSource: step }), []);

  const { handleDraftStepBlur, handleDraftStepInput, handleDraftStepKeydown, startDrafting, draftStepInputRef, isDrafting, draftStepText } = useDraftStep({
    onSubmit: handleSubmitDraftStep,
  });

  const handleRun = useCallback(
    async (id: string) => {
      const found = cells.find((cell) => cell.id === id);
      if (!found) return;

      if (found.stepDefinition?.chosenTool !== "search") return;
      if (found.stepDefinition?.toolInput.provider !== "ux_db") return;

      const searchResult = await props.appContext.searchProxy.searchClaims({
        queryType: "semantic",
        queryLanguage: "en-US",
        top: found.stepDefinition.toolInput.limit,
        skip: found.stepDefinition.toolInput.skip,
        search: found.stepDefinition.toolInput.query,
        semanticConfiguration: "similar-claims",
      });

      console.log(searchResult);
    },
    [cells, props.appContext]
  );

  return (
    <div class="c-notebook">
      <menu>
        <button>Run all</button>
        <button>Clear all</button>
        <button onClick={deleteAllCells}>Delete all</button>
      </menu>
      <div class="cell-list">
        {cells.map((cell) => (
          <div class="cell" key={cell.id}>
            <br />
            <hr />
            <br />
            <menu>
              <button onClick={() => handleRun(cell.id)}>Run</button>
              <button onClick={() => deleteCell(cell.id)}>Delete</button>
            </menu>
            <label for={`task-${cell.id}`}>{cell.title ?? "New task"}</label>
            <textarea
              id={`task-${cell.id}`}
              value={cell.stepSource}
              placeholder="What would you like to do?"
              onInput={(e) => handleStepChange(cell.id, (e.target as HTMLTextAreaElement).value)}
            ></textarea>
            {cell.input ? (
              <>
                <label for={`data-source-${cell.id}`}>Input lens</label>
                <textarea id={`data-source-${cell.id}`} value={cell.input}></textarea>
              </>
            ) : null}
          </div>
        ))}
      </div>
      <br />
      <hr />
      <br />
      <menu>
        {isDrafting ? (
          <textarea
            ref={draftStepInputRef}
            id={`new-task`}
            value={draftStepText}
            placeholder="What would you like to do?"
            onInput={handleDraftStepInput}
            onBlur={handleDraftStepBlur}
            onKeyDown={handleDraftStepKeydown}
          ></textarea>
        ) : (
          <button onClick={startDrafting}>New step</button>
        )}
      </menu>
    </div>
  );
}
