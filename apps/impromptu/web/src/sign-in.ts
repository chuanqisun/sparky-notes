import { interactiveSignIn } from "./account/auth";

async function main() {
  const code_verfier = new URLSearchParams(location.search).get("code_verifier");
  if (!code_verfier) {
    console.error("missing verifier");
    return;
  }

  interactiveSignIn(code_verfier);
}

main();
