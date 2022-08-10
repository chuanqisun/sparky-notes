import { useEffect, useState } from "preact/hooks";

const GRAPHQL_ENDPOINT = "https://hits-figma-proxy.azurewebsites.net/graphql";

export interface QueryResult {
  error: any;
  loading: boolean;
  data: any;
}

export interface QueryInput extends GraphqlInput {
  skip?: boolean;
}

export function useQuery(token: string, input: QueryInput) {
  const [result, setResult] = useState<QueryResult>({
    error: undefined,
    loading: false,
    data: undefined,
  });

  useEffect(() => {
    if (input.skip) return;

    setResult({
      error: undefined,
      loading: true,
      data: undefined,
    });
    graphql(token, input).then((response) => {
      setResult({
        error: response.errors,
        loading: false,
        data: response.data,
      });
    });
  }, [input.skip, JSON.stringify([input.query, input.variables])]);

  return result;
}

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
