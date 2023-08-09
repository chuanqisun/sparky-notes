import type { GetTokenInput, GetTokenOutput, SignInInput, SignInOutput, SignInStatusOutput, SignOutInput, SignOutOutput } from "@h20/server/src/interface";
import { generateCodeChallengeFromVerifier, generateCodeVerifier } from "../utils/crypto";

export interface EmbeddedSignInOptions {
  serverHost: string;
  webHost: string; // where `sign-in.html` is
}
export async function embeddedSignIn({ serverHost, webHost }: EmbeddedSignInOptions) {
  const code_verifier = generateCodeVerifier();

  // TODO, directly navigate to AAD portal. No need to open sign-in.html
  window.open(`${webHost}/sign-in.html?code_verifier=${code_verifier}`);

  const result: SignInStatusOutput = await fetch(`${serverHost}/hits/signinstatus`, {
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

export interface InteractiveSignInOptions {
  codeVerifier: string;
  aadClientId: string;
  oauthScopes: string;
  aadTenentId: string;
  webHost: string; // where `auth-reidrect.html` is
}
export async function interactiveSignIn({ aadClientId, codeVerifier, aadTenentId, oauthScopes, webHost }: InteractiveSignInOptions) {
  const challenge = await generateCodeChallengeFromVerifier(codeVerifier);
  const params = new URLSearchParams({
    client_id: aadClientId,
    response_type: "code",
    redirect_uri: `${webHost}/auth-redirect.html`,
    scope: oauthScopes,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  sessionStorage.setItem("aad-last-verifier", codeVerifier);
  location.replace(`https://login.microsoftonline.com/${aadTenentId}/oauth2/v2.0/authorize?${params}`);
}

export interface AuthRedirectResult {
  email: string;
  idToken: string;
}

export interface HandleOAuthRedirectOptions {
  serverHost: string;
}
export async function handleOAuthRedirect({ serverHost }: HandleOAuthRedirectOptions): Promise<SignInOutput | null> {
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

  const result: SignInOutput = await fetch(`${serverHost}/hits/signin`, {
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

export interface GetAccessTokenOptions {
  input: GetTokenInput;
  serverHost: string;
}

export async function getAccessToken({ input, serverHost }: GetAccessTokenOptions): Promise<GetTokenOutput> {
  const result = await fetch(`${serverHost}/hits/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!result.ok) throw new Error(result.statusText);

  return result.json();
}

export interface SignOutRemoteOptions {
  input: SignOutInput;
  serverHost: string;
}

export async function signOutRemote({ input, serverHost }: SignOutRemoteOptions): Promise<SignOutOutput> {
  const result = await fetch(`${serverHost}/hits/signout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!result.ok) throw new Error(result.statusText);

  return result.json();
}
