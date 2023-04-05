import { useCallback, useState } from "preact/hooks";
import { AppContext } from "../../main";
import "./duo-loop.css";
import { useMemoryAgent } from "./memory-agent";
import { useInputField } from "./use-input-field";

export interface DuoLoopProps {
  context: AppContext;
}
export function DuoLoop(props: DuoLoopProps) {
  const memoryAgent = useMemoryAgent();
  const [stdout, setStdout] = useState("");

  const handleQuery = useCallback(
    async (query: string) => {
      const response = await memoryAgent.query(query);
      setStdout(response);
      return "";
    },
    [memoryAgent.query]
  );

  const queryField = useInputField({ onEnter: handleQuery });
  const commandField = useInputField({ onEnter: () => "" });

  return (
    <div class="c-duo">
      <textarea placeholder="Query" onKeyDown={queryField.handleKeydown} onInput={queryField.handleInput} value={queryField.text} />
      <textarea placeholder="Command" onKeyDown={commandField.handleKeydown} onInput={commandField.handleInput} value={commandField.text} />
      <div class="c-stdout">{stdout}</div>
    </div>
  );
}
