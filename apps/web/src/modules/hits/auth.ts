const AUTH_SERVER_HOST = import.meta.env.VITE_AUTH_SERVER_HOST;

export interface GetTokenInput {
  email: string;
  userClientId: string;
  id_token: string;
}

export async function getAccessToken(input: GetTokenInput): Promise<string> {
  const result = await fetch(`${AUTH_SERVER_HOST}/hits/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!result.ok) throw new Error(result.statusText);

  return result.json();
}
