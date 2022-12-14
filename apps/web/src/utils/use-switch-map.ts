import { useCallback, useMemo, useState } from "preact/hooks";

export function useSwitchMap<T extends any[], K>(task: (...args: T) => Promise<K>) {
  const [state, setState] = useState<{ lastStartTime: number; lastResolvedStartTime?: number; data?: K; error?: any }>();

  const setResult = useCallback((startTime: number, data?: K, error?: any) => {
    setState((prev) => {
      if (!prev) throw new Error("clock must be set before resolving values");

      if (prev?.lastResolvedStartTime && prev.lastResolvedStartTime > startTime) return prev; // noop

      return {
        ...prev,
        lastResolvedStartTime: startTime,
        data,
        error,
      };
    });
  }, []);

  const switchableTask = useCallback(
    async (...args: T) => {
      const startTime = performance.now();
      setState((prev) => ({
        ...prev,
        lastStartTime: startTime,
      }));

      try {
        const value = await task(...args);
        setResult(startTime, value);
      } catch (error) {
        setResult(startTime, undefined, error);
      }
    },
    [task]
  );

  const data = useMemo(() => state?.data, [state]);
  const isLoading = useMemo(() => state?.lastStartTime !== state?.lastResolvedStartTime, [state]);
  const error = useMemo(() => state?.error, [state]);

  return { task: switchableTask, data, isLoading, error };
}
