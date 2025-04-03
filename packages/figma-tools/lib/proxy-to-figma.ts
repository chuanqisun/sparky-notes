export interface ProxyToFigma<MessageToFigma, MessageToWeb> {
  listen(listener: (message: MessageToWeb) => any): void;
  notify(message: MessageToFigma): void;
  request(request: MessageToFigma): Promise<MessageToWeb>;
  respond(request: MessageToWeb, response: MessageToFigma): void;
}

export function getProxyToFigma<MessageToFigma, MessageToWeb>(pluginId: string): ProxyToFigma<MessageToFigma, MessageToWeb> {
  const notify = (message: MessageToFigma) => sendMessage(pluginId, message);
  const listeners = new Set<(message: MessageToWeb) => any>();

  window.addEventListener("message", (e) => {
    const { pluginMessage } = e.data;
    if (!pluginMessage) return;
    listeners.forEach((listener) => listener(pluginMessage as MessageToWeb));
  });

  async function request(message: MessageToFigma) {
    const _sourceId = crypto.randomUUID();
    return new Promise<MessageToWeb>((resolve) => {
      const messageHandler = (e: MessageEvent) => {
        const { _id, ...restOfMessage } = e.data.pluginMessage;
        if (_id === _sourceId) {
          window.removeEventListener("message", messageHandler);
          resolve(restOfMessage);
        }
      };

      window.addEventListener("message", messageHandler);
      notify({ ...message, _id: _sourceId } as any);
    });
  }

  function respond(request: MessageToWeb, response: MessageToFigma) {
    notify({ ...response, _id: (request as any)._id } as any);
  }

  function listen(listener: (message: MessageToWeb) => any) {
    listeners.add(listener);
  }

  return {
    listen,
    notify,
    request,
    respond,
  };
}

function sendMessage<T>(pluginId: string, message: T) {
  parent.postMessage({ pluginMessage: message, pluginId }, "*");
}
