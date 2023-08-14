import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";

export default {};
console.log("[debug-shim] ready");

const mainIframe = document.querySelector<HTMLIFrameElement>("#iframe-main")!;
const cardIframe = document.querySelector<HTMLIFrameElement>("#iframe-card")!;
const typePreview = document.querySelector<HTMLInputElement>(`[data-preview="type"]`)!;
const idPreview = document.querySelector<HTMLInputElement>(`[data-preview="id"]`)!;

mainIframe.src = import.meta.env.VITE_WEB_HOST;
cardIframe.src = import.meta.env.VITE_WEB_HOST + "/card.html";

window.addEventListener("message", (e) => {
  const message = e.data?.pluginMessage as MessageToFigma;
  console.log(`[debug] UI -> Main`, message);

  if (message.createCards) {
    typePreview.value = message.createCards.cards.at(0)!.entityType.toString();
    idPreview.value = message.createCards.cards.at(0)!.entityId;
  }
});

window.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest("[data-action]");
  const action = target?.closest("[data-action]")?.getAttribute("data-action");

  switch (action) {
    case "loadCard":
      cardIframe.src = import.meta.env.VITE_WEB_HOST + `/card.html?entityId=${idPreview.value}&entityType=${typePreview.value}`;
      break;
    case "rotate":
      // select the last iframe on the page and prepend it to the first iframe
      const lastIframe = [...document.querySelectorAll("iframe")].at(-1)!;
      const firstIframe = document.querySelector("iframe")!;
      firstIframe.insertAdjacentElement("beforebegin", lastIframe);
      break;
  }
});

function sendMessageFromMockMain(message: MessageToWeb) {
  document.querySelector("iframe")!.contentWindow!.postMessage({ pluginMessage: message }, "*");
}
