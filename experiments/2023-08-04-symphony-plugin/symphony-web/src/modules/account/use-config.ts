import { CONFIG_CACHE_KEY, getInitialConfig } from "./config";
import { useLocalStorage } from "./use-local-storage";

export function useConfig() {
  const hitsConfig = useLocalStorage({
    key: CONFIG_CACHE_KEY,
    getInitialValue: getInitialConfig,
  });

  return hitsConfig;
}
