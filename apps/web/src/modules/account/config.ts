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

export function validateConfig(maybeConfig: any): maybeConfig is HitsConfig {
  return maybeConfig && typeof maybeConfig.email === "string" && typeof maybeConfig.idToken === "string" && typeof maybeConfig.userClientId === "string";
}
