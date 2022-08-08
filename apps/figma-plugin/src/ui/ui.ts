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

  document.getElementById("sign-in")!.onclick = async () => {
    const { user_code, device_code, expires_in, interval, message } = await fetch("http://localhost:5000/api/devicecode").then((res) => res.json());
    console.log(message);
    const pollResult = await poll({ device_code });
    console.log(pollResult);
  };
}

main();

async function poll({ device_code }) {
  const authResult = await new Promise((resolve, reject) => {
    const poller = setInterval(async () => {
      try {
        const pollResponse = await fetch(`http://localhost:5000/api/token`, {
          method: "post",
          body: JSON.stringify({ device_code }),
        });
        clearInterval(poller);
        clearTimeout(timeout);
        resolve(pollResponse.json());
      } catch {}
    }, 5000);

    const timeout = setTimeout(() => {
      clearInterval(poller);
      reject("Timeout");
    }, 120000); // 2 min
  });

  return authResult;
}
