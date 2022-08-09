import { getDeviceCode, getToken } from "./api/auth";

let accessToken: string | null = null;

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

    const pollResult = await getToken({ device_code, timeoutMs: expires_in * 1000, intervalMs: interval * 1000 });
    console.log(pollResult);

    (document.querySelector(`textarea[name="token"]`) as HTMLTextAreaElement).value = JSON.stringify(pollResult);
    accessToken = pollResult.access_token;
    tokenInput!.value = accessToken as string;
  };
}

main();
