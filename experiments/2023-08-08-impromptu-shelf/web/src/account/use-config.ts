import { useLocalStorage } from "../utils/use-local-storage";
import { CONFIG_CACHE_KEY, getInitialConfig } from "./config";

export function useConfig() {
  const hitsConfig = useLocalStorage({
    key: CONFIG_CACHE_KEY,
    getInitialValue: getInitialConfig,
  });

  return hitsConfig;
}
