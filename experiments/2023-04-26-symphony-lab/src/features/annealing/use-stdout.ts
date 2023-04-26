import { useCallback, useEffect, useRef, useState } from "preact/hooks";

export function useStdout() {
  const [entries, setEntries] = useState<string[]>([]);
  const stdoutRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (stdoutRef.current) {
      stdoutRef.current.scrollTop = stdoutRef.current.scrollHeight;
    }
  }, [entries]);

  const append = useCallback((text: string) => setEntries((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${text}`]), []);
  const appendInline = useCallback((text: string) => setEntries((prev) => [...prev.slice(0, -1), `${prev.at(-1) ?? ""}${text}`]), []);
  const clear = useCallback(() => setEntries([]), []);

  return {
    entries,
    stdoutRef,
    append,
    appendInline,
    clear,
  };
}
