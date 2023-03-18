import type { MessageToFigma, MessageToUI } from "@symphony/types";

export function notifyUI(message: MessageToUI) {
  figma.ui.postMessage(message);
}

export function respondUI(request: MessageToFigma, response: MessageToUI) {
  figma.ui.postMessage({ ...response, _id: (request as any)._id });
}

let nounce = 0;

export function requestUI(message: MessageToUI) {
  nounce = getNextNounce(nounce);
  const _sourceId = nounce.toString();
  return new Promise<MessageToFigma>((resolve) => {
    const messageHandler = (e: MessageToFigma) => {
      const { _id, ...restOfMessage } = e as any;
      if (_id === _sourceId) {
        figma.ui.off("message", messageHandler);
        resolve(restOfMessage);
      }
    };

    figma.ui.on("message", messageHandler);
    figma.ui.postMessage({ ...message, _id: _sourceId });
  });
}

function getNextNounce(nounce: number) {
  nounce++;
  if (nounce > Number.MAX_SAFE_INTEGER) {
    nounce = 0;
  }

  return nounce;
}
