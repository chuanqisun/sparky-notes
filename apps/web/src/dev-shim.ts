import type { MessageToMain, MessageToUI } from "@h20/types";

export default {};
console.log("[debug-shim] ready");

document.querySelector<HTMLIFrameElement>("#iframe-main")!.src = import.meta.env.VITE_WEB_HOST;
document.querySelector<HTMLIFrameElement>("#iframe-card")!.src = import.meta.env.VITE_WEB_HOST + "/card.html";

window.addEventListener("message", (e) => {
  const message = e.data?.pluginMessage as MessageToMain;

  console.log(`[debug] UI -> Main`, message);
});

window.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest("[data-action]");
  const action = target?.closest("[data-action]")?.getAttribute("data-action");

  switch (action) {
    case "ping":
      sendMessageFromMockMain({
        ping: new Date().toLocaleString(),
      });
      break;
    case "openUrl":
      const iframe = document.querySelector("iframe")!;
      const mutableUrl = new URL(iframe.src);
      mutableUrl.searchParams.set("openUrl", "https://bing.com");
      mutableUrl.search = mutableUrl.searchParams.toString();
      iframe.src = mutableUrl.toString();
      break;
  }
});

function sendMessageFromMockMain(message: MessageToUI) {
  document.querySelector("iframe")!.contentWindow!.postMessage({ pluginMessage: message }, "*");
}
