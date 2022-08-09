import { getDeviceCode, getTokenByPolling, getTokenByRefresh, TokenSummary } from "./api/auth";

async function main() {
  const tokenInput = document.querySelector(`input[name="token"]`) as HTMLInputElement;
  const searchButton = document.getElementById("search") as HTMLButtonElement;

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

  document.getElementById("sign-in")!.onclick = async () => {
    const { user_code, verification_uri, message, interval, expires_in, device_code } = await getDeviceCode();

    document.querySelector<HTMLInputElement>(`input[name="authCode"]`)!.value = user_code;
    (document.getElementById("verifyUrl") as HTMLButtonElement).textContent = "Sign in";
    (document.getElementById("verifyUrl") as HTMLButtonElement).hidden = false;
    (document.getElementById("verifyUrl") as HTMLButtonElement).onclick = () => window.open(verification_uri);

    const tokenSummary = await getTokenByPolling({ device_code, timeoutMs: expires_in * 1000, intervalMs: interval * 1000 });
    console.log(tokenSummary);

    (document.querySelector(`textarea[name="token"]`) as HTMLTextAreaElement).value = JSON.stringify(tokenSummary);
    tokenInput!.value = tokenSummary.access_token;

    parent.postMessage({ pluginMessage: { type: "setToken", token: tokenSummary } }, "https://www.figma.com");
  };

  document.getElementById("auto-sign-in")!.onclick = async () => {
    window.onmessage = (event) => {
      switch (event.data?.pluginMessage?.type) {
        case "storedToken":
          const tokenSummary = event.data.pluginMessage.token as TokenSummary;

          if (tokenSummary.expires_at - 1000 * 60 > Date.now()) {
            console.log("UI received token", tokenSummary);

            (document.querySelector(`textarea[name="token"]`) as HTMLTextAreaElement).value = JSON.stringify(tokenSummary);
            tokenInput!.value = tokenSummary.access_token;

            autoRefreshToken(tokenSummary);
          } else {
            console.log("UI received expired token", tokenSummary);
          }

          break;
      }
    };
    parent.postMessage({ pluginMessage: { type: "getToken" } }, "https://www.figma.com");
  };
}

main();

export async function autoRefreshToken({ refresh_token, device_code }) {
  let latestRefreshToken = refresh_token;
  setInterval(async () => {
    const newTokenSummary = await getTokenByRefresh({ refresh_token: latestRefreshToken, device_code });
    latestRefreshToken = newTokenSummary.refresh_token;
    console.log(newTokenSummary);
    parent.postMessage({ pluginMessage: { type: "setToken", token: newTokenSummary } }, "https://www.figma.com");
  }, 5000);
}
