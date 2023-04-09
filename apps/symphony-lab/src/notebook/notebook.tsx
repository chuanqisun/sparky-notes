import { useCallback, useState } from "preact/hooks";
import type { AppContext } from "../main";
import "./notebook.css";
import { useDraftTask } from "./use-draft-task";

export interface NotebookProps {
  appContext: AppContext;
}

export interface NotebookCell {
  id: string;
  task: string;
  title?: string;
  input?: string;
}

export function Notebook(props: NotebookProps) {
  const [cells, setCells] = useState<NotebookCell[]>([]);

  const handleAddTask = useCallback(async (text: string) => {
    setCells((prev) => [...prev, { id: crypto.randomUUID(), task: text }]);
  }, []);

  const deleteTask = useCallback((id: string) => setCells((prev) => prev.filter((cell) => cell.id !== id)), []);
  const deleteAllTasks = useCallback(() => setCells([]), []);

  const updateTask = useCallback(
    (id: string, update: Partial<NotebookCell>) => setCells((prev) => prev.map((cell) => (cell.id === id ? { ...cell, ...update } : cell))),
    []
  );

  const handleTaskChange = useCallback((id: string, task: string) => updateTask(id, { task }), []);

  const { handleDraftTaskBlur, handleDraftTaskInput, handleDraftTaskKeydown, addDraftTask, draftTaskInputRef, isDrafting, draftTask } = useDraftTask({
    onSubmit: handleAddTask,
  });

  return (
    <div class="c-notebook">
      <menu>
        <button>Run all</button>
        <button>Clear all</button>
        <button onClick={deleteAllTasks}>Delete all</button>
      </menu>
      <div class="cell-list">
        {cells.map((cell) => (
          <div class="cell" key={cell.id}>
            <br />
            <hr />
            <br />
            <menu>
              <button>Run</button>
              <button onClick={() => deleteTask(cell.id)}>Delete</button>
            </menu>
            <label for={`task-${cell.id}`}>{cell.title ?? "New task"}</label>
            <textarea
              id={`task-${cell.id}`}
              value={cell.task}
              placeholder="What would you like to do?"
              onInput={(e) => handleTaskChange(cell.id, (e.target as HTMLTextAreaElement).value)}
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
            ref={draftTaskInputRef}
            id={`new-task`}
            value={draftTask}
            placeholder="What would you like to do?"
            onInput={handleDraftTaskInput}
            onBlur={handleDraftTaskBlur}
            onKeyDown={handleDraftTaskKeydown}
          ></textarea>
        ) : (
          <button onClick={addDraftTask}>New task</button>
        )}
      </menu>
    </div>
  );
}
