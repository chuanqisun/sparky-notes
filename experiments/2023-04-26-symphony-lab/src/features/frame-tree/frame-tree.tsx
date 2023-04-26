import { useCallback, useState } from "preact/hooks";
import type { AppContext } from "../../main";
import { fUpdateFrameByPath } from "./f-update-frame-by-path";
import "./frame-tree.css";
import { goalToTaskFrames } from "./prompts/get-tasks";

export interface Frame {
  id: string;
  goal: string;
  action?: string;
  effect?: Effect;
  children: Frame[];
}

export interface Effect {
  saveText?: string;
  createFrames?: Frame[];
  updateFrames?: Frame[];
}

export interface FreeTreeRootProps {
  context: AppContext;
}

export function FrameTreeRoot(props: FreeTreeRootProps) {
  const [frame, setFrame] = useState<Frame>({
    id: crypto.randomUUID(),
    goal: ["Solve climate change", "Reduce Seattle traffic jam", "Cure cancer", "Colonize Mars", "Build the World's computer", "Create AGI"][
      Math.floor(Math.random() * 6)
    ],
    children: [],
  });

  const updateFrameByPath = useCallback((idPath: string[], update: (frame: Frame) => Frame) => setFrame(fUpdateFrameByPath.bind(null, idPath, update)), []);

  const handleGoalChange = useCallback((idPath: string[], goal: string) => updateFrameByPath(idPath, (frame) => ({ ...frame, goal })), []);
  const handleAnalyzeGoal = useCallback(
    async (idPath: string[], goal: string) => {
      const tasksResults = await goalToTaskFrames(props.context, goal);
      updateFrameByPath(idPath, (frame) => ({ ...frame, children: tasksResults }));
    },
    [props.context.getChat]
  );

  return <FrameTree frame={frame} onGoalChange={handleGoalChange} onAnalyzeGoal={handleAnalyzeGoal} />;
}

export interface FrameTreeProps {
  frame: Frame;
  onGoalChange: (idPath: string[], goal: string) => void;
  onAnalyzeGoal: (idPath: string[], goal: string) => void;
}

export function FrameTree(props: FrameTreeProps) {
  return (
    <details>
      <summary>{props.frame.goal}</summary>
      <div class="frame-body">
        <input type="text" value={props.frame.goal} onInput={(e) => props.onGoalChange([props.frame.id], (e.target as HTMLInputElement).value)} />
        <button onClick={() => props.onAnalyzeGoal([props.frame.id], props.frame.goal)}>Think</button>
        <button onClick={() => props.onAnalyzeGoal([props.frame.id], props.frame.goal)}>Run (think + act)</button>
        {props.frame.children.map((child) => (
          <FrameTree
            key={child.id}
            frame={child}
            onGoalChange={(idPath, goal) => props.onGoalChange([props.frame.id, ...idPath], goal)}
            onAnalyzeGoal={(idPath, goal) => props.onAnalyzeGoal([props.frame.id, ...idPath], goal)}
          />
        ))}
      </div>
    </details>
  );
}
