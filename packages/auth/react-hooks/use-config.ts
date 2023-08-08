import { CONFIG_CACHE_KEY, getInitialConfig } from "../client/config";
import { useLocalStorage } from "../preact-hooks/use-local-storage";

export function useConfig() {
  const hitsConfig = useLocalStorage({
    key: CONFIG_CACHE_KEY,
    getInitialValue: getInitialConfig,
  });

  return hitsConfig;
}
