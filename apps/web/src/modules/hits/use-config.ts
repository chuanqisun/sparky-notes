import { useLocalStorage } from "../../utils/use-local-storage";
import { getBlankConfig } from "./config";

export function useConfig() {
  const hitsConfig = useLocalStorage({
    namespace: "hits-config",
    getInitialValue: getBlankConfig,
  });

  return hitsConfig;
}
