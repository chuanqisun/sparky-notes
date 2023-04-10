import { useCallback, useState } from "preact/hooks";
import type { NotebookAppContext } from "../notebook";
import { getCombo } from "../utils/keyboard";
import "./notebook.css";
import { analyzeStep } from "./prompts/analyze-step";
import { categorizeSupervised } from "./prompts/categorize-supervised";
import { categorizeUnsupervised } from "./prompts/categorize-unsupervised";
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

  const handleRun = useCallback(
    async (id: string, cells: NotebookCell[]) => {
      const found = cells.find((cell) => cell.id === id);
      if (!found) return;

      console.log("Run start");
      updateCellOutput(id, () => []);

      // Tool context
      const prevCellOutput = cells.at(cells.indexOf(found) - 1)?.output ?? [];
      const toolName = found.stepDefinition?.chosenTool;
      const toolInput = found.stepDefinition?.toolInput;
      if (!toolName || !toolInput) return;

      switch (toolName) {
        case "search": {
          if (toolInput.provider !== "hits") return;

          const items = await props.appContext.searchProxy.searchClaims({
            queryType: "semantic",
            queryLanguage: "en-US",
            top: toolInput.limit,
            skip: toolInput.skip,
            search: toolInput.query,
            semanticConfiguration: "similar-claims",
          });

          console.log(items);
          updateCell(id, { output: items.map((item) => `${item.ClaimTitle}\n${item.ClaimContent}`) });

          break;
        }

        case "keep_by_filter":
        case "remove_by_filter": {
          const predicate = toolInput.predicate;
          if (!predicate) return;

          const isKeep = toolName === "keep_by_filter";

          const resultPrefix = (raw: "yes" | "no" | "error") =>
            isKeep ? (raw === "yes" ? "keep" : raw === "no" ? "remove" : "error") : raw === "yes" ? "remove" : raw === "no" ? "keep" : "error";

          const result = await filter(props.appContext, {
            predicate,
            list: prevCellOutput,
            isStopRequested: () => stopRequested,
            onProgress: (item, answer) => {
              updateCellOutput(id, (prevOutput) => [...prevOutput, `[${resultPrefix(answer)}] ${item}`]);
            },
          });

          updateCellOutput(id, () => (toolName === "keep_by_filter" ? result.yes : result.no));
          console.log(result);
          break;
        }

        case "categorize_supervised": {
          const labels = toolInput.labels;

          const { results, errors } = await categorizeSupervised(props.appContext, {
            labels,
            list: prevCellOutput,
            isStopRequested: () => stopRequested,
            onProgress: (item, label) => {
              updateCellOutput(id, (prevOutput) => [...prevOutput, `[${label}] ${item}`]);
            },
          });

          updateCellOutput(id, () => results);
          console.log({ results, errors });
          break;
        }

        case "categorize_unsupervised": {
          const { basedOn, categoryCount } = toolInput;

          const nodes = await categorizeUnsupervised(props.appContext, {
            basedOn,
            idealCategoryCount: categoryCount,
            list: prevCellOutput,
          });

          if (stopRequested) return;

          updateCellOutput(id, () => nodes.map((node) => `# ${node.data}\n${node.children.map((child) => `  - ${child}`).join("\n")}`));
          break;
        }
      }
    },
    [props.appContext]
  );

  const handleRegenerate = useCallback(
    async (cell: NotebookCell, allContextCells: NotebookCell[]) => {
      stopRequested = false;

      const currentIndex = allContextCells.findIndex((item) => item.id === cell.id);
      const cellsBefore = allContextCells.slice(0, currentIndex > -1 ? currentIndex : undefined);

      setCells((prev) => prev.map((prevCell) => (prevCell.id === cell.id ? { ...prevCell, output: ["Generating..."] } : prevCell)));

      try {
        const step = await analyzeStep(
          props.appContext,
          {
            stepDescription: cell.editableDescription,
            previousSteps: cellsBefore.filter((cell) => cell.stepDefinition).map((cell) => cell.stepDefinition!),
          },
          { model: "v4-8k" }
        );

        if (stopRequested) throw new Error("Stop requested");

        if (step?.chosenTool) {
          setCells((prev) => {
            const updatedCells = prev.map((prevCell) =>
              prevCell.id === cell.id ? { ...prevCell, editableDescription: step.description, title: step.name, stepDefinition: step, output: [] } : prevCell
            );
            // hack, chain into run
            console.log("Step generation success. Will run once");
            setTimeout(() => handleRun(cell.id, updatedCells));

            return updatedCells;
          });
        } else if (step) {
          setCells((prev) =>
            prev.map((prevCell) =>
              prevCell.id === cell.id
                ? {
                    ...prevCell,
                    title: step.name,
                    stepDefinition: step,
                    output: ["No tools found. Please update the step and regenerate."],
                  }
                : prevCell
            )
          );
        }
      } catch (e: any) {
        setCells((prev) =>
          prev.map((prevCell) =>
            prevCell.id === cell.id
              ? {
                  ...prevCell,
                  output: [`Error: ${e.name} ${e.message}`],
                }
              : prevCell
          )
        );
      }
    },
    [props.appContext, cells, handleRun]
  );

  const handleSubmitDraftStep = useCallback(
    async (text: string) => {
      // add placeholder cell
      const id = crypto.randomUUID();
      const newCell = { id, editableDescription: text, title: text, stepDefinition: null };
      setCells((prev) => [...prev, newCell]);

      // hygrade placeholder cell
      handleRegenerate(newCell, cells);
    },
    [handleRegenerate, cells]
  );

  const { handleDraftStepBlur, handleDraftStepInput, handleDraftStepKeydown, startDrafting, draftStepInputRef, isDrafting, draftStepText } = useDraftStep({
    onSubmit: handleSubmitDraftStep,
  });

  return (
    <div class="c-notebook">
      <menu>
        <button>Run all</button>
        <button onClick={() => (stopRequested = true)}>Stop all</button>
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
              <button onClick={() => handleRegenerate(cell, cells)}>Regenerate and run</button>
              <button onClick={() => handleRun(cell.id, cells)}>Re-run</button>
              <button onClick={() => (stopRequested = true)}>Stop</button>
              <button onClick={() => handleClearCell(cell.id)}>Clear</button>
              <button onClick={() => deleteCell(cell.id)}>Delete</button>
            </menu>

            <details class="step-io" open={true}>
              <summary class="step-io__title">{cell.title ?? "New task"}</summary>
              <div class="step-io__body">
                <div data-resize-textarea-content={cell.editableDescription}>
                  <textarea
                    id={`task-${cell.id}-pseudo`}
                    value={cell.editableDescription}
                    placeholder="What would you like to do? (Submit with Ctrl+Enter)"
                    onKeyDown={(e) => {
                      if (getCombo(e) === "ctrl+enter") {
                        e.preventDefault();
                        handleRegenerate(cell, cells);
                      }
                    }}
                    onInput={(e) => handleStepChange(cell.id, (e.target as HTMLTextAreaElement).value)}
                  ></textarea>
                </div>
                {cell.stepDefinition ? (
                  <pre class="source-code">{`${cell.stepDefinition?.chosenTool}(${JSON.stringify(cell.stepDefinition?.toolInput, null, 2)})`.trim()}</pre>
                ) : null}
                {cell.output ? (
                  <ul>
                    {cell.output?.map((item) => (
                      <li>
                        <div class="output-item" onClick={(e) => (e.target as HTMLDivElement).classList.toggle("output-item--expanded")}>
                          {item}
                        </div>
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
        <div data-resize-textarea-content={draftStepText}>
          <textarea
            ref={draftStepInputRef}
            id={`new-task`}
            value={draftStepText}
            placeholder="What would you like to do? (Submit with Ctrl+Enter)"
            onInput={handleDraftStepInput}
            onBlur={handleDraftStepBlur}
            onKeyDown={handleDraftStepKeydown}
          ></textarea>
        </div>
      ) : (
        <menu>
          <button onClick={startDrafting}>New step</button>
        </menu>
      )}
    </div>
  );
}
