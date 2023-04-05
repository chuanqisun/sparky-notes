import { useCallback, useState } from "preact/hooks";

export function useMemoryAgent() {
  const [memoryEntries, setMemoryEntries] = useState<string[]>([]);

  const query = useCallback(async (query: string) => memoryEntries.map((entry) => `- ${entry}`).join("\n"), []);
  const add = useCallback((entry: string) => setMemoryEntries((prev) => [...prev, entry]), []);

  return {
    query,
    add,
  };
}
