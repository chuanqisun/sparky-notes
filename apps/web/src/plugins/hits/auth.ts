import { authConfig } from "@h20/auth";
import type { GetTokenInput, GetTokenOutput, SignInInput, SignInOutput, SignInStatusOutput, SignOutInput, SignOutOutput } from "@h20/auth-server";
import { generateCodeChallengeFromVerifier, generateCodeVerifier } from "../../utils/crypto";

const AUTH_SERVER_HOST = import.meta.env.VITE_AUTH_SERVER_HOST;
const WEB_HOST = import.meta.env.VITE_WEB_HOST;

export async function embeddedSignIn() {
  const code_verifier = generateCodeVerifier();
  window.open(`${WEB_HOST}/sign-in.html?code_verifier=${code_verifier}`);

  const result: SignInStatusOutput = await fetch(`${AUTH_SERVER_HOST}/hits/signinstatus`, {
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

export async function interactiveSignIn(code_verifier: string) {
  const challenge = await generateCodeChallengeFromVerifier(code_verifier);
  const params = new URLSearchParams({
    client_id: authConfig.AAD_CLIENT_ID,
    response_type: "code",
    redirect_uri: `${WEB_HOST}/auth-redirect.html`,
    scope: authConfig.OAUTH_SCOPES,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  sessionStorage.setItem("aad-last-verifier", code_verifier);
  location.replace(`https://login.microsoftonline.com/${authConfig.AAD_TENANT_ID}/oauth2/v2.0/authorize?${params}`);
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

  const result: SignInOutput = await fetch(`${AUTH_SERVER_HOST}/hits/signin`, {
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

export async function signOutRemote(input: SignOutInput): Promise<SignOutOutput> {
  const result = await fetch(`${AUTH_SERVER_HOST}/hits/signout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!result.ok) throw new Error(result.statusText);

  return result.json();
}
