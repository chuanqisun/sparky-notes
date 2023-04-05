import { useCallback } from "preact/hooks";
import { AppContext } from "../../main";
import "./duo-loop.css";
import { useInputField } from "./use-input-field";
import { useMemoryAgent } from "./use-memory-agent";
import { useStdout } from "./use-stdout";

export interface DuoLoopProps {
  context: AppContext;
}
export function DuoLoop(props: DuoLoopProps) {
  const memoryAgent = useMemoryAgent({ context: props.context });
  const stdout = useStdout();

  const handleQuery = useCallback(
    async (query: string) => {
      const response = await memoryAgent.query(query);
      stdout.append(response);
      return "";
    },
    [memoryAgent.query, stdout.append]
  );

  const handleCommand = useCallback(
    async (command: string) => {
      await memoryAgent.add(command);
      stdout.append(`Executed ${command}`);
      return "";
    },
    [memoryAgent.add, stdout.append]
  );

  const queryField = useInputField({ onEnter: handleQuery });
  const commandField = useInputField({ onEnter: handleCommand });

  return (
    <div class="c-duo">
      <textarea placeholder="Query" onKeyDown={queryField.handleKeydown} onInput={queryField.handleInput} value={queryField.text} />
      <textarea placeholder="Command" onKeyDown={commandField.handleKeydown} onInput={commandField.handleInput} value={commandField.text} />
      {stdout.entries.length ? (
        <div class="c-stdout" ref={stdout.stdoutRef}>
          {stdout.entries.map((entry, index) => (
            <div key={index}>{entry}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
