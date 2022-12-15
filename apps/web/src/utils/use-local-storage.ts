import { useCallback, useRef, useState } from "preact/hooks";
import { getJson, setJson } from "./local-storage";

export interface UseLocalStorageProps<T = any> {
  namespace: string;
  getInitialValue: () => T;
  validate?: (value: any) => boolean;
}
export function useLocalStorage<T = any>(props: UseLocalStorageProps<T>) {
  const initialConfig = useRef(getJson(props.namespace, props.validate) ?? props.getInitialValue());
  const [value, setConfig] = useState<T>(initialConfig.current);

  const update = useCallback((value: T) => {
    try {
      setJson(props.namespace, value);
      setConfig(value);
    } catch {}
  }, []);

  const reset = useCallback(() => {
    try {
      const config = props.getInitialValue();
      setJson(props.namespace, config);
      setConfig(config);
    } catch {}
  }, []);

  return {
    value,
    update,
    reset,
  };
}
