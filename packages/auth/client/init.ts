import { ensureJson } from "../utils/local-storage";
import { TOKEN_CACHE_KEY, getInitialToken, validateToken } from "./access-token";
import { CONFIG_CACHE_KEY, getInitialConfig, validateConfig } from "./config";

export function initAuthClient() {
  ensureJson(CONFIG_CACHE_KEY, validateConfig, getInitialConfig);
  ensureJson(TOKEN_CACHE_KEY, validateToken, getInitialToken);
}
