import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import "./usage.css";

export function getSessionTokenUsage(): number {
  const sessionTokenUsage = parseInt(localStorage.getItem("session-token-usage") ?? "0");
  return sessionTokenUsage;
}
export function setSessionTokenUsage(tokenUsage: number) {
  localStorage.setItem("session-token-usage", tokenUsage.toString());
}

const DAVINCI_3_CENTS_PER_1000TOKENS = 0.02;

export function useTokenMeter() {
  const [tokenCount, setTokenCount] = useState(0);

  const increaseTokenCount = useCallback((count: number) => {
    const updatedTokenMeterValue = getSessionTokenUsage() + count;
    setSessionTokenUsage(updatedTokenMeterValue);
    setTokenCount(updatedTokenMeterValue);
  }, []);

  const costInCents = useMemo(() => (tokenCount * DAVINCI_3_CENTS_PER_1000TOKENS) / 1000, [tokenCount]);

  // initial
  useEffect(() => {
    setTokenCount(getSessionTokenUsage());
  }, []);

  const reset = useCallback(() => {
    setTokenCount(0);
    setSessionTokenUsage(0);
  }, []);

  return {
    tokenCount,
    costInCents,
    reset,
    increaseTokenCount,
  };
}
