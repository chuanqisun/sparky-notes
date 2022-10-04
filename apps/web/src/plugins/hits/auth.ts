import type { GetTokenInput, GetTokenOutput, SignInInput, SignInOutput, SignInStatusOutput, SignOutInput, SignOutOutput } from "@h20/auth-server";
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

  const result: SignInStatusOutput = await fetch(`http://localhost:5201/hits/signinstatus`, {
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
export async function handleOAuthRedirect(): Promise<SignInOutput | null> {
  const code_verifier = sessionStorage.getItem("aad-last-verifier");
  const code = new URLSearchParams(location.search).get("code");
  if (!code_verifier || !code) {
    console.error("missing verifier or code");
    return null;
  }

  const input: SignInInput = {
    code,
    code_verifier,
  };

  const result: SignInOutput = await fetch(`http://localhost:5201/hits/signin`, {
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(input),
  }).then((res) => res.json());

  console.log("[hits] id updated", result);
  const mutableUrl = new URL(location.href);
  mutableUrl.search = "";
  history.replaceState(undefined, "", mutableUrl);

  return result;
}

export async function getAccessToken(input: GetTokenInput): Promise<GetTokenOutput> {
  const result = await fetch(`http://localhost:5201/hits/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!result.ok) throw new Error(result.statusText);

  return result.json();
}

export async function signOutRemote(input: SignOutInput): Promise<SignOutOutput> {
  const result = await fetch(`http://localhost:5201/hits/signout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!result.ok) throw new Error(result.statusText);

  return result.json();
}
