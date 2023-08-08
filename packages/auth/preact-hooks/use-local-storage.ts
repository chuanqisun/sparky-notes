import { useCallback, useRef, useState } from "preact/hooks";
import { getJson, setJson } from "../utils/local-storage";

export interface UseLocalStorageProps<T = any> {
  key: string;
  getInitialValue: () => T;
}
export function useLocalStorage<T = any>(props: UseLocalStorageProps<T>) {
  const initialConfig = useRef(getJson(props.key) ?? props.getInitialValue());
  const [value, setConfig] = useState<T>(initialConfig.current);

  const update = useCallback((value: T) => {
    try {
      setJson(props.key, value);
      setConfig(value);
    } catch {}
  }, []);

  const reset = useCallback(() => {
    try {
      const config = props.getInitialValue();
      setJson(props.key, config);
      setConfig(config);
    } catch {}
  }, []);

  return {
    value,
    update,
    reset,
  };
}
