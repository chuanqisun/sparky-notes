export interface ProxyToWeb<MessageToWeb, MessageToFigma> {
  listen(listener: (message: MessageToFigma) => any): void;
  notify(message: MessageToWeb): void;
  request(request: MessageToWeb): Promise<MessageToFigma>;
  respond(request: MessageToFigma, response: MessageToWeb): void;
}

export function getProxyToWeb<MessageToWeb, MessageToFigma>(): ProxyToWeb<MessageToWeb, MessageToFigma> {
  const notify = (message: MessageToWeb) => figma.ui.postMessage(message);
  const listeners = new Set<(message: MessageToFigma) => any>();

  figma.ui.on("message", (msg) => {
    listeners.forEach((listener) => listener(msg as MessageToFigma));
  });

  function respond(request: MessageToFigma, response: MessageToWeb) {
    figma.ui.postMessage({ ...response, _id: (request as any)._id });
  }

  let nounce = 0;

  function request(message: MessageToWeb) {
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

  function listen(listener: (message: MessageToFigma) => any) {
    listeners.add(listener);
  }

  function getNextNounce(nounce: number) {
    nounce++;
    if (nounce > Number.MAX_SAFE_INTEGER) {
      nounce = 0;
    }

    return nounce;
  }

  return {
    listen,
    request,
    respond,
    notify,
  };
}
