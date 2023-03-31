import { useState } from "preact/hooks";
import { getCombo } from "../../utils/keyboard";
import type { ChatMessage, OpenAIChatPayload, OpenAIChatResponse } from "../openai/chat";
import { parseZeroKnowledgeReponse, zeroKnowledgePrompt } from "../openai/prompts/extract-action";
import "./notebook.css";

export interface NotebookProps {
  chat: (messages: ChatMessage[], config?: Partial<OpenAIChatPayload>) => Promise<OpenAIChatResponse>;
}

export function Notebook(props: NotebookProps) {
  const [thoughtValue, setToughtValue] = useState("");

  // refactor to reducer
  const [tree, setTree] = useState<Node[]>([]);

  const handleKeydown = (e: Event) => {
    switch (getCombo(e as KeyboardEvent)) {
      case "ctrl+enter": {
        e.preventDefault();
        props
          .chat(...zeroKnowledgePrompt(thoughtValue))
          .then((res) => parseZeroKnowledgeReponse(res.choices[0].message.content))
          .then((tasks) => setTree((tree) => [...tree, ...tasks.map((task) => ({ id: crypto.randomUUID(), displayText: task, type: NodeType.Action }))]))
          .catch();
        break;
      }
    }
  };

  return (
    <div class="c-notebook">
      <input
        placeholder="What would you like to do?"
        value={thoughtValue}
        type="text"
        onInput={(e) => setToughtValue((e.target as HTMLInputElement).value)}
        onKeyDown={handleKeydown}
      />
      <div class="c-nodebook-tree">
        {tree.map((node) => (
          <div key={node.id} id={node.id}>
            {node.displayText}
          </div>
        ))}
      </div>
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
