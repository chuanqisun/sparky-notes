/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useRef, useState } from "react";
import { getJson, setJson } from "./storage";

export interface UseLocalStorageProps<T = any> {
  key: string;
  getInitialValue: () => T;
}
export function useLocalStorage<T = any>(props: UseLocalStorageProps<T>) {
  const initialConfig = useRef(getJson(props.key) ?? props.getInitialValue());
  const [value, setConfig] = useState<T>(initialConfig.current);

  const update = useCallback(
    (value: T) => {
      try {
        setJson(props.key, value);
        setConfig(value);
      } catch {
        // ignore
      }
    },
    [props.key]
  );

  const reset = useCallback(() => {
    try {
      const config = props.getInitialValue();
      setJson(props.key, config);
      setConfig(config);
    } catch {
      // ignore
    }
  }, [props]);

  return {
    value,
    update,
    reset,
  };
}
