import { Subject, filter, fromEvent, map } from "rxjs";

export function getFigmaProxy<MessageFromUI, MessageFromFigma>(window: Window) {
  const messageSubject = new Subject<MessageFromFigma>();

  fromEvent<MessageEvent>(window, "message")
    .pipe(
      filter(isFigmaPluginMessage),
      map((e) => e.data.pluginMessage)
    )
    .subscribe(messageSubject);

  const $rx = messageSubject.asObservable();
  const $tx = new Subject<MessageFromUI>();

  $tx.subscribe((data) => {
    window.parent.postMessage(
      {
        pluginMessage: data,
      },
      "*"
    );
  });

  return {
    $rx,
    $tx,
  };
}

function isFigmaPluginMessage(message: MessageEvent): message is { data: { pluginMessage: any } } & MessageEvent {
  return message.data?.pluginMessage !== undefined;
}
