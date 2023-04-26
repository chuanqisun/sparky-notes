import { useState } from "preact/hooks";
import type { AppContext } from "../../main";
import { goalMapper, goalReducer, questionMapper, questionReducer, taskReducer, tasksMapper } from "../openai/prompts/map-reduce/map-reduce";
import "./notebook.css";

export interface NotebookProps {
  context: AppContext;
}

export interface Iteration {
  id: string;
  items: WorkItem[];
}

export interface WorkItem {
  id: string;
  displayText: string;
}

export function Notebook(props: NotebookProps) {
  const [iterations, setIterations] = useState<Iteration[]>([
    {
      id: crypto.randomUUID(),
      items: [],
    },
  ]);

  const mapStep = async (headIndex: number) => {
    const headIteration = iterations[headIndex];

    const goals = await goalMapper(props.context, headIteration.items);
    const tasks = await tasksMapper(props.context, headIteration.items);
    const questions = await questionMapper(props.context, headIteration.items);
    const newItems: WorkItem[] = [...goals, ...tasks, ...questions];

    setIterations((iterations) => [...iterations.slice(0, headIndex + 1), { id: crypto.randomUUID(), items: newItems }]);
  };

  const reduceStep = async (headIndex: number) => {
    const headIteration = iterations[headIndex];

    const goals = await goalReducer(props.context, headIteration.items);
    const tasks = await taskReducer(props.context, headIteration.items);
    const questions = await questionReducer(props.context, headIteration.items);
    const newItems: WorkItem[] = [...goals, ...tasks, ...questions];

    setIterations((iterations) => [...iterations.slice(0, headIndex + 1), { id: crypto.randomUUID(), items: newItems }]);
  };

  const clearBelow = async (tailIndex: number) => {
    setIterations((iterations) => [...iterations.slice(0, tailIndex + 1)]);
  };

  const add = (iterationIndex: number) => {
    setIterations((iterations) => {
      const iterationItems = iterations[iterationIndex].items;
      const newIteration: Iteration = { id: crypto.randomUUID(), items: [{ id: crypto.randomUUID(), displayText: "" }, ...iterationItems] };
      return [...iterations.slice(0, iterationIndex), newIteration, ...iterations.slice(iterationIndex + 1)];
    });
  };

  const updateItem = (iterationIndex: number, itemIndex: number, updateItem: (item: WorkItem) => WorkItem) => {
    setIterations((iterations) => {
      const iterationItems = iterations[iterationIndex].items;
      const newIteration: Iteration = {
        id: iterations[iterationIndex].id,
        items: [...iterationItems.slice(0, itemIndex), updateItem(iterationItems[itemIndex]), ...iterationItems.slice(itemIndex + 1)],
      };
      return [...iterations.slice(0, iterationIndex), newIteration, ...iterations.slice(iterationIndex + 1)];
    });
  };

  const handleItemInput = (e: Event, iterationIndex: number, itemIndex: number) => {
    const newValue = (e.target as HTMLInputElement).value;
    updateItem(iterationIndex, itemIndex, (item) => ({ ...item, displayText: newValue }));
  };

  const handleItemRemove = (iterationIndex: number, itemIndex: number) => {
    setIterations((iterations) => {
      const iterationItems = iterations[iterationIndex].items;
      const newIteration: Iteration = {
        id: iterations[iterationIndex].id,
        items: [...iterationItems.slice(0, itemIndex), ...iterationItems.slice(itemIndex + 1)],
      };

      return [...iterations.slice(0, iterationIndex), newIteration, ...iterations.slice(iterationIndex + 1)];
    });
  };

  return (
    <div class="c-notebook">
      {iterations.map((iteration, iterationIndex) => (
        <div key={iteration.id} class="c-notebook__iteration">
          <menu>
            <button onClick={() => add(iterationIndex)}>Add item</button>
          </menu>
          <ul class="c-notebook__work-item-list">
            {iteration.items.map((item, itemIndex) => (
              <li key={item.id} class="c-notebook__work-item">
                <textarea
                  class="c-notebook__work-item-input c-notebook__work-item-input--edit"
                  type="text"
                  value={item.displayText}
                  onInput={(e) => handleItemInput(e, iterationIndex, itemIndex)}
                />
                <button onClick={() => handleItemRemove(iterationIndex, itemIndex)}>Remove</button>
              </li>
            ))}
          </ul>
          <menu>
            <button onClick={() => mapStep(iterationIndex)}>Map</button>
            <button onClick={() => reduceStep(iterationIndex)}>Reduce</button>
            <button onClick={() => clearBelow(iterationIndex)}>Clear below</button>
          </menu>
        </div>
      ))}
    </div>
  );
}

export interface Node {
  id: string;
  displayText: string;
  type: NodeType;
  actionPhase?: NodePhase;
  children?: Node[];
}

export enum NodeType {
  Action = "action",
  Observation = "observation",
}

export enum NodePhase {
  Suggested = "suggested",
  Pending = "pending",
  Completed = "completed",
}
