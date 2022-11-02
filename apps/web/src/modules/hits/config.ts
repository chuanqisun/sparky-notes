import { getJson } from "../../utils/local-storage";

export interface HitsConfig {
  email: string;
  idToken: string;
  userClientId: string;
}

export const getHitsConfig = () => getJson<HitsConfig>("hits-config") ?? getBlankConfig();

export function getBlankConfig(): HitsConfig {
  return {
    email: "alias@microsoft.com",
    idToken: "examplehitsdevelopertoken",
    userClientId: "unassigned",
  };
}
