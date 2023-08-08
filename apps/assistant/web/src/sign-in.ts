import { authConfig } from "@h20/auth";
import { interactiveSignIn } from "./modules/account/auth";

async function main() {
  const codeVerifier = new URLSearchParams(location.search).get("code_verifier");
  if (!codeVerifier) {
    console.error("missing verifier");
    return;
  }

  interactiveSignIn({ codeVerifier, aadTenentId: authConfig.AAD_TENANT_ID, webHost: import.meta.env.VITE_WEB_HOST });
}

main();
