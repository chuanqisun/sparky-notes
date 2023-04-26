import { useCallback, useEffect, useRef, useState } from "preact/hooks";

export function useStdout() {
  const [entries, setEntries] = useState<string[]>([]);
  const stdoutRef = useRef<HTMLDivElement>(null);
  useEffect(() => (stdoutRef.current?.lastChild as HTMLDivElement)?.scrollIntoView?.(), [entries]);

  const append = useCallback((text: string) => setEntries((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${text}`]), []);
  const clear = useCallback(() => setEntries([]), []);

  return {
    entries,
    stdoutRef,
    append,
    clear,
  };
}
