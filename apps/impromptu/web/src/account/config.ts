export interface HitsConfig {
  email: string;
  idToken: string;
  userClientId: string;
}

export const CONFIG_CACHE_KEY = "hits-config";

export function getInitialConfig(): HitsConfig {
  return {
    email: "",
    idToken: "",
    userClientId: "",
  };
}

export function validateConfig(maybeConfig: Partial<HitsConfig>): maybeConfig is HitsConfig {
  return (
    typeof maybeConfig === "object" &&
    typeof maybeConfig?.email === "string" &&
    typeof maybeConfig?.idToken === "string" &&
    typeof maybeConfig?.userClientId === "string"
  );
}
