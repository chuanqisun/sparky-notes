import type { BaseEventTypes, BaseRouteTypes, PickKeysByValueType, RouteHandler } from "./types";

export class WorkerServer<RouteTypes extends BaseRouteTypes, EventTypes extends BaseEventTypes> {
  private listeners: ((...args: any[]) => any)[] = [];
  private port!: MessagePort | DedicatedWorkerGlobalScope;

  constructor(private worker: DedicatedWorkerGlobalScope | SharedWorkerGlobalScope) {}

  start() {
    if (this.isDedicatedWorker(this.worker)) {
      this.bindToPort(this.worker);
    } else {
      this.worker.addEventListener("connect", async (connectEvent) => {
        const port = connectEvent.ports[0];
        this.bindToPort(port);
        port.start();
      });
    }
    return this;
  }

  private bindToPort(port: MessagePort | DedicatedWorkerGlobalScope) {
    this.port = port;
    this.listeners.forEach((listener) => port.addEventListener("message", listener.bind(this, port)));
  }

  private isDedicatedWorker(worker: DedicatedWorkerGlobalScope | SharedWorkerGlobalScope): worker is DedicatedWorkerGlobalScope {
    return typeof DedicatedWorkerGlobalScope !== "undefined";
  }

  emit<EventType extends keyof EventTypes>(type: EventType, ...args: EventTypes[EventType] extends undefined ? [] : [data: EventTypes[EventType]]) {
    this.port.postMessage({
      type,
      data: args[0],
    });
  }

  onRequest<TRoute extends PickKeysByValueType<RouteTypes, RouteHandler>>(route: TRoute, handler: RouteTypes[TRoute]) {
    this.listeners.push(async (port: MessagePort | DedicatedWorkerGlobalScope, event) => {
      const { route: requestRoute, nonce, data } = (event as MessageEvent).data;

      if (route !== requestRoute) return;

      try {
        const responseData = await handler({ req: data, emit: this.emit.bind(this) as any });

        port.postMessage({
          nonce,
          data: responseData,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(error);

        // We can't forward native error to the client due to Firefox limitation
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1556604
        const serializableError = {
          name: (error as Error).name ?? "Unknown error",
          message: (error as Error).message ?? "No error message available",
        };

        port.postMessage({
          nonce,
          error: serializableError,
          timestamp: Date.now(),
        });
      }
    });

    return this;
  }
}
