export interface HitsConfig {
  email: string;
  idToken: string;
  userClientId: string;
}

export function getBlankConfig(): HitsConfig {
  return {
    email: "alias@microsoft.com",
    idToken: "examplehitsdevelopertoken",
    userClientId: "unassigned",
  };
}
