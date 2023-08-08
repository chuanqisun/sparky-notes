import { identity } from "@h20/auth";
import { interactiveSignIn } from "./modules/account/auth";

async function main() {
  const codeVerifier = new URLSearchParams(location.search).get("code_verifier");
  if (!codeVerifier) {
    console.error("missing verifier");
    return;
  }

  interactiveSignIn({
    aadClientId: identity.AAD_CLIENT_ID,
    codeVerifier,
    aadTenentId: identity.AAD_TENANT_ID,
    oauthScopes: identity.OAUTH_SCOPES,
    webHost: import.meta.env.VITE_WEB_HOST,
  });
}

main();
