import { generateCodeChallengeFromVerifier, generateCodeVerifier } from "../../utils/crypto";

const AAD_CLIENT_ID = "bc9d8487-53f6-418d-bdce-7ed1f265c33a";
const AAD_TENANT_ID = "72f988bf-86f1-41af-91ab-2d7cd011db47";
const HITS_API_RESOURCE_ID = "https://microsoft.onmicrosoft.com/MSFT_HITS_API";
const GRAPH_API_RESOURCE_ID = "https://graph.microsoft.com";

export async function interactiveSignIn() {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallengeFromVerifier(verifier);
  const params = new URLSearchParams({
    client_id: AAD_CLIENT_ID,
    response_type: "code",
    redirect_uri: "http://localhost:5200/auth-redirect.html",
    scope: `${HITS_API_RESOURCE_ID}/.default email offline_access openid`,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  sessionStorage.setItem("aad-last-verifier", verifier);
  window.open(`https://login.microsoftonline.com/${AAD_TENANT_ID}/oauth2/v2.0/authorize?${params}`);
}

export interface AuthRedirectResult {
  email: string;
  idToken: string;
}
export async function handleOAuthRedirect(): Promise<AuthRedirectResult | null> {
  const verifier = sessionStorage.getItem("aad-last-verifier");
  const code = new URLSearchParams(location.search).get("code");
  if (!code) return null;

  const result = await fetch(`http://localhost:5002/hits/signin?code=${code}&code_verifier=${verifier}`).then((res) => res.json());
  const { email, id_token } = result;

  console.log("[hits] id updated", result);
  const mutableUrl = new URL(location.href);
  mutableUrl.search = "";
  history.replaceState(undefined, "", mutableUrl);

  return {
    email,
    idToken: id_token,
  };
}
