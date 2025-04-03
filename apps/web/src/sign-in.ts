import { interactiveSignIn } from "@h20/auth";

async function main() {
  const codeVerifier = new URLSearchParams(location.search).get("code_verifier");
  if (!codeVerifier) {
    console.error("missing verifier");
    return;
  }

  interactiveSignIn({
    aadClientId: import.meta.env.VITE_AAD_CLIENT_ID,
    codeVerifier,
    aadTenentId: import.meta.env.VITE_AAD_TENANT_ID,
    oauthScopes: import.meta.env.VITE_AAD_OAUTH_SCOPES,
    webHost: `${location.protocol}//${location.host}`,
  });
}

main();
