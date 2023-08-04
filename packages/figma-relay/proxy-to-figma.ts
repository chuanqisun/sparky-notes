export interface FigmaProxy<MessageToFigma, MessageToWeb> {
  notify(message: MessageToFigma): void;
  request(request: MessageToFigma): Promise<MessageToWeb>;
  respond(request: MessageToWeb, response: MessageToFigma): void;
}

export function proxyToFigma<MessageToFigma, MessageToWeb>(pluginId: string): FigmaProxy<MessageToFigma, MessageToWeb> {
  const notify = (message: MessageToFigma) => sendMessage(pluginId, message);

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

  return {
    notify,
    request,
    respond,
  };
}

function sendMessage<T>(pluginId: string, message: T) {
  parent.postMessage({ pluginMessage: message, pluginId }, "*");
}
