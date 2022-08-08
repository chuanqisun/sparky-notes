import msal from "@azure/msal-node";

const msalConfig = {
  auth: {
    clientId: "325dce49-3946-473a-9427-cd186fa462c2",
    authority: `https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47/`,
  },
};

const pca = new msal.PublicClientApplication(msalConfig);

console.log(pca);

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
    const data = await fetch("https://hits-uat.microsoft.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "hits-api-base-url": "https://hitsstage-api-uat.azurewebsites.net/api/",
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

  document.getElementById("sign-in")!.onclick = () => {
    console.log("sign in");
  };
}

main();
