import { AuthService } from "./api/auth";

async function main() {
  const tokenInput = document.querySelector(`input[name="token"]`) as HTMLInputElement;
  const searchButton = document.getElementById("search") as HTMLButtonElement;
  const signInButton = document.getElementById("sign-in") as HTMLButtonElement;
  const signOutButton = document.getElementById("sign-out") as HTMLButtonElement;
  const authCodeInput = document.querySelector(`input[name="authCode"]`) as HTMLInputElement;
  const verifyButton = document.getElementById("verifyUrl") as HTMLButtonElement;

  const authService = new AuthService({
    onTokenChange: (token) => {
      if (token) {
        (document.querySelector(`textarea[name="token"]`) as HTMLTextAreaElement).value = JSON.stringify(token);
        tokenInput!.value = token.access_token;
      } else {
        (document.querySelector(`textarea[name="token"]`) as HTMLTextAreaElement).value = "";
        tokenInput!.value = "";
      }
    },
  });

  const query = `query Search($args: SearchArgs!) {
    search(args: $args) {
      organicResults {
        id
        title
      }
    }
  }`;

  searchButton.onclick = async () => {
    const data = await fetch("http://localhost:5000/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "hits-api-authorization": `Bearer ${tokenInput.value}`,
      },
      body: JSON.stringify({
        query,
        variables: {
          args: {
            query: "Keyboard",
            filters: {},
          },
        },
      }),
    }).then((r) => r.json());

    document.getElementById("results")!.innerHTML = (data as any).data.search.organicResults
      .map((result) => `<li><button data-id="${result.id}" data-title="${result.title}">${result.id} - ${result.title}</button></li>`)
      .join("");
  };

  document.getElementById("results")!.onclick = (e) => {
    const item = (e.target as HTMLElement).closest("[data-id]")!;
    const id = item.getAttribute("data-id");
    const title = item.getAttribute("data-title");
    parent.postMessage({ pluginMessage: { type: "selectItem", id, title } }, "*");
  };

  signInButton!.onclick = async () => {
    const { user_code, verification_uri } = await authService.signIn();

    authCodeInput.value = user_code;
    verifyButton.textContent = "Sign in";
    verifyButton.hidden = false;
    verifyButton.onclick = () => window.open(verification_uri);
  };

  signOutButton!.onclick = async () => {
    await authService.signOut();
  };
}

main();
