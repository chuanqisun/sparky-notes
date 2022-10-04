import { useCallback, useRef, useState } from "preact/hooks";

export interface UseLocalStorageProps<T = any> {
  namespace: string;
  getInitialValue: () => T;
}
export function useLocalStorage<T = any>(props: UseLocalStorageProps<T>) {
  const initialConfig = useRef(loadConfig(props.namespace) ?? props.getInitialValue());
  const [value, setConfig] = useState<T>(initialConfig.current);

  const update = useCallback((value: T) => {
    try {
      saveConfig(props.namespace, value);
      setConfig(value);
    } catch {}
  }, []);

  const reset = useCallback(() => {
    try {
      const config = props.getInitialValue();
      saveConfig(props.namespace, config);
      setConfig(config);
    } catch {}
  }, []);

  return {
    value,
    update,
    reset,
  };
}

export function saveConfig(namespace: string, config: any) {
  localStorage.setItem(namespace, JSON.stringify(config));
}

export function loadConfig<T = any>(namespace: string): T | null {
  const config = localStorage.getItem(namespace);
  return config ? JSON.parse(config) : null;
}
