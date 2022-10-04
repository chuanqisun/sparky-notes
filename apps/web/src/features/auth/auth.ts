import { generateCodeChallengeFromVerifier, generateCodeVerifier } from "../../utils/crypto";

const AAD_CLIENT_ID = "bc9d8487-53f6-418d-bdce-7ed1f265c33a";
const AAD_TENANT_ID = "72f988bf-86f1-41af-91ab-2d7cd011db47";
const HITS_API_RESOURCE_ID = "https://microsoft.onmicrosoft.com/MSFT_HITS_API";

export async function interactiveSignIn(code_verifier: string) {
  const challenge = await generateCodeChallengeFromVerifier(code_verifier);
  const params = new URLSearchParams({
    client_id: AAD_CLIENT_ID,
    response_type: "code",
    redirect_uri: "http://localhost:5200/auth-redirect.html",
    scope: `${HITS_API_RESOURCE_ID}/.default email offline_access openid`,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  sessionStorage.setItem("aad-last-verifier", code_verifier);
  location.replace(`https://login.microsoftonline.com/${AAD_TENANT_ID}/oauth2/v2.0/authorize?${params}`);
}

export async function embeddedSignIn() {
  const code_verifier = generateCodeVerifier();
  window.open(`http://localhost:5200/sign-in.html?code_verifier=${code_verifier}`);

  const result = await fetch(`http://localhost:5201/hits/signinstatus`, {
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      code_verifier: code_verifier,
    }),
  }).then((res) => res.json());

  console.log(`[embedded-signin]`, result);
  return result;
}

export interface AuthRedirectResult {
  email: string;
  idToken: string;
}
export async function handleOAuthRedirect(): Promise<AuthRedirectResult | null> {
  const verifier = sessionStorage.getItem("aad-last-verifier");
  const code = new URLSearchParams(location.search).get("code");
  if (!verifier || !code) {
    console.error("missing verifier or code");
    return null;
  }

  // TODO hide creds in POST body
  const result = await fetch(`http://localhost:5201/hits/signin?code=${code}&code_verifier=${verifier}`).then((res) => res.json());
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
