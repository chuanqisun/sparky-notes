import { useEffect, useState } from "preact/hooks";

export const useDebounce = <T>(value: T, initialValue: T, delayInMs: number) => {
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayInMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayInMs]);

  return debouncedValue;
};
