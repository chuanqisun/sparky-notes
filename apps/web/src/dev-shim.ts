import type { MessageToMain, MessageToUI } from "types";

export default {};
console.log("[debug-shim] ready");

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
  }
});

function sendMessageFromMockMain(message: MessageToUI) {
  document.querySelector("iframe")!.contentWindow!.postMessage({ pluginMessage: message }, "*");
}
