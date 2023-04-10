import { useCallback, useState } from "preact/hooks";
import type { NotebookAppContext } from "../notebook";
import "./notebook.css";
import { analyzeStep } from "./prompts/analyze-step";
import { filter } from "./prompts/filter";
import type { Step } from "./prompts/tool-v2";
import { useDraftStep } from "./use-draft-step";

export interface NotebookProps {
  appContext: NotebookAppContext;
}

export interface NotebookCell {
  id: string;
  editableDescription: string;
  stepDefinition: Step | null;
  title?: string;
  output?: any[];
}

let stopRequested = false;

export function Notebook(props: NotebookProps) {
  const [cells, setCells] = useState<NotebookCell[]>([]);

  const handleSubmitDraftStep = useCallback(
    async (text: string) => {
      stopRequested = false;
      const step = await analyzeStep(
        props.appContext,
        { stepDescription: text, previousSteps: cells.filter((cell) => cell.stepDefinition).map((cell) => cell.stepDefinition!) },
        { model: "v4-8k" }
      );

      if (stopRequested) return;

      console.log("step analyzed", step);
      if (step?.chosenTool) {
        setCells((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            editableDescription: step.description,
            title: step.name,
            stepDefinition: step,
          },
        ]);
      } else if (step) {
        setCells((prev) => [...prev, { id: crypto.randomUUID(), editableDescription: text, title: step.name, stepDefinition: step }]);
      } else {
        setCells((prev) => [...prev, { id: crypto.randomUUID(), editableDescription: text, title: "Error creating step", stepDefinition: null }]);
      }
    },
    [props.appContext, cells]
  );

  const handleRegenerate = useCallback(
    async (id: string) => {
      stopRequested = false;
      const cell = cells.find((cell) => cell.id === id);
      if (!cell) return;

      const step = await analyzeStep(
        props.appContext,
        { stepDescription: cell.editableDescription, previousSteps: cells.filter((cell) => cell.stepDefinition).map((cell) => cell.stepDefinition!) },
        { model: "v4-8k" }
      );

      if (stopRequested) return;

      console.log("step analyzed", step);
      if (step?.chosenTool) {
        setCells((prev) =>
          prev.map((prevCell) =>
            prevCell.id === id ? { ...prevCell, editableDescription: step.description, title: step.name, stepDefinition: step } : prevCell
          )
        );
      }
    },
    [props.appContext, cells]
  );

  const deleteCell = useCallback((id: string) => setCells((prev) => prev.filter((cell) => cell.id !== id)), []);
  const handleDeleteAllCells = useCallback(() => setCells([]), []);
  const handleClearAllCells = useCallback(() => setCells((prev) => prev.map((cell) => ({ ...cell, output: [] }))), []);

  const updateCell = useCallback(
    (id: string, update: Partial<NotebookCell>) => setCells((prev) => prev.map((cell) => (cell.id === id ? { ...cell, ...update } : cell))),
    []
  );
  const updateCellOutput = useCallback(
    (id: string, updateOutput: (prevOutput: any[]) => any[]) =>
      setCells((prev) => prev.map((cell) => (cell.id === id ? { ...cell, output: updateOutput(cell.output ?? []) } : cell))),
    []
  );

  const handleStepChange = useCallback((id: string, step: string) => updateCell(id, { editableDescription: step }), []);
  const handleClearCell = useCallback((id: string) => updateCell(id, { output: [] }), []);

  const { handleDraftStepBlur, handleDraftStepInput, handleDraftStepKeydown, startDrafting, draftStepInputRef, isDrafting, draftStepText } = useDraftStep({
    onSubmit: handleSubmitDraftStep,
  });

  const handleRun = useCallback(
    async (id: string) => {
      const found = cells.find((cell) => cell.id === id);
      if (!found) return;

      switch (found.stepDefinition?.chosenTool) {
        case "search": {
          if (found.stepDefinition?.toolInput.provider !== "ux_db") return;

          const items = await props.appContext.searchProxy.searchClaims({
            queryType: "semantic",
            queryLanguage: "en-US",
            top: found.stepDefinition.toolInput.limit,
            skip: found.stepDefinition.toolInput.skip,
            search: found.stepDefinition.toolInput.query,
            semanticConfiguration: "similar-claims",
          });

          console.log(items);
          updateCell(id, { output: items.map((item) => `${item.ClaimTitle} ${item.ClaimContent}`) });

          break;
        }

        case "filter_in": {
          const predicate = found.stepDefinition?.toolInput.predicate;
          if (!predicate) return;

          const prevCellOutput = cells.at(cells.indexOf(found) - 1)?.output ?? [];

          const result = await filter(props.appContext, {
            predicate,
            list: prevCellOutput,
            isStopRequested: () => stopRequested,
            onProgress: (item, answer) => {
              updateCellOutput(id, (prevOutput) => [...prevOutput, `[${answer}] ${item}`]);
            },
          });

          updateCellOutput(id, () => result.yes);
          console.log(result);
        }
      }
    },
    [cells, props.appContext]
  );

  return (
    <div class="c-notebook">
      <menu>
        <button disabled>Run all</button>
        <button
          onClick={() => {
            stopRequested = true;
          }}
        >
          Stop all
        </button>
        <button onClick={handleClearAllCells}>Clear all</button>
        <button onClick={handleDeleteAllCells}>Delete all</button>
      </menu>
      <div class="cell-list">
        {cells.map((cell) => (
          <div class="cell" key={cell.id}>
            <br />
            <hr />
            <br />
            <menu>
              <button onClick={() => handleRun(cell.id)}>Run</button>
              <button onClick={() => handleRegenerate(cell.id)}>Regenerate</button>
              <button onClick={() => handleClearCell(cell.id)}>Clear</button>
              <button onClick={() => deleteCell(cell.id)}>Delete</button>
            </menu>

            <details class="step-io" open={true}>
              <summary class="step-io__title">{cell.title ?? "New task"}</summary>
              <div class="step-io__body">
                <label for={`task-${cell.id}-pseudo`}>Action</label>
                <textarea
                  id={`task-${cell.id}-pseudo`}
                  value={cell.editableDescription}
                  placeholder="What would you like to do?"
                  onInput={(e) => handleStepChange(cell.id, (e.target as HTMLTextAreaElement).value)}
                ></textarea>
                <pre class="source-code">{`${cell.stepDefinition?.chosenTool}(${JSON.stringify(cell.stepDefinition?.toolInput, null, 2)})`.trim()}</pre>
                {cell.output ? (
                  <ul>
                    {cell.output?.map((item) => (
                      <li>
                        <div class="output-item">{item}</div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </details>
          </div>
        ))}
      </div>
      <br />
      <hr />
      <br />
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
        <menu>
          <button onClick={startDrafting}>New step</button>
        </menu>
      )}
    </div>
  );
}
