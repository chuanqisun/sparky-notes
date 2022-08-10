import { AuthService } from "./api/auth";
import { graphql, GraphqlInput, SEARCH_QUERY } from "./api/graphql";

async function main() {
  const searchButton = document.getElementById("search") as HTMLButtonElement;
  const signInButton = document.getElementById("sign-in") as HTMLButtonElement;
  const signOutButton = document.getElementById("sign-out") as HTMLButtonElement;
  const authCodeInput = document.querySelector(`input[name="authCode"]`) as HTMLInputElement;
  const verifyButton = document.getElementById("verifyUrl") as HTMLButtonElement;
  const searchResultContainer = document.getElementById("results") as HTMLElement;
  const oneTimeCodePrompt = document.getElementById("one-time-code-prompt") as HTMLElement;

  let boundGraphql: <T = any>(input: GraphqlInput) => T = () => {
    throw new Error("Authentication required");
  };

  const authService = new AuthService({
    onTokenChange: (token) => {
      if (token) {
        boundGraphql = graphql.bind(null, token.access_token);
        document.body.classList.add("signed-in");
        document.body.classList.remove("signed-out");
      } else {
        boundGraphql = () => {
          throw new Error("Authenication required");
        };
        document.body.classList.remove("signed-in");
        document.body.classList.add("signed-out");
      }
    },
  });

  searchButton.onclick = async () => {
    const data = await boundGraphql({
      query: SEARCH_QUERY,
      variables: {
        args: {
          query: "Keyboard",
          filters: {},
        },
      },
    });

    searchResultContainer.innerHTML = (data as any).data.search.organicResults
      .map((result) => `<li><button data-id="${result.id}" data-title="${result.title}">${result.id} - ${result.title}</button></li>`)
      .join("");
  };

  searchResultContainer.onclick = (e) => {
    const item = (e.target as HTMLElement).closest("[data-id]")!;
    const id = item.getAttribute("data-id");
    const title = item.getAttribute("data-title");
    parent.postMessage({ pluginMessage: { type: "selectItem", id, title } }, "*");
  };

  signInButton!.onclick = async () => {
    const { user_code, verification_uri } = await authService.signIn();

    oneTimeCodePrompt.hidden = false;
    authCodeInput.value = user_code;
    verifyButton.textContent = "Sign in with One-time code";
    verifyButton.onclick = () => window.open(verification_uri);
  };

  signOutButton!.onclick = async () => {
    oneTimeCodePrompt.hidden = true;
    await authService.signOut();
  };
}

main();
