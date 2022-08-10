import { useEffect, useState } from "preact/hooks";

export const useDebounce = (value: string, initialValue: string, delayInMs: number) => {
  const [debouncedValue, setDebouncedValue] = useState<string>(initialValue);

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
