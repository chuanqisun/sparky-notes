const GRAPHQL_ENDPOINT = "https://hits-figma-proxy.azurewebsites.net/graphql";
export interface GraphqlInput {
  query: string;
  variables?: any;
}

export async function graphql(token: string, input: GraphqlInput) {
  const data = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "hits-api-authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: input.query,
      variables: input.variables,
    }),
  }).then((r) => r.json());

  return data;
}
