import { useCallback, useEffect, useState } from "preact/hooks";
import type { AppContext } from "../../main";
import { observeMemory } from "./prompts/memory";

export interface UseMemoryAgentProps {
  context: AppContext;
}
export function useMemoryAgent(props: UseMemoryAgentProps) {
  const [memoryEntries, setMemoryEntries] = useState<string[]>([]);

  const query = useCallback(
    async (query: string) => {
      const observation = await observeMemory(props.context, query, memoryEntries);
      return observation;
    },
    [props.context.getChat, memoryEntries]
  );
  const add = useCallback(async (entry: string) => {
    setMemoryEntries((prev) => [...prev, entry]);
  }, []);

  // debug
  useEffect(() => {
    console.log(`debug memory`, memoryEntries);
  }, [memoryEntries]);

  return {
    query,
    add,
  };
}
