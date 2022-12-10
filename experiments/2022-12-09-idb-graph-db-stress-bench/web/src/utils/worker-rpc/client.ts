import type { BaseEventTypes, BaseRouteTypes, PickKeysByValueType, RouteHandler } from "./types";

export class WorkerClient<RouteTypes extends BaseRouteTypes, EventTypes extends BaseEventTypes> {
  private port: Worker | MessagePort;

  constructor(worker: Worker | SharedWorker) {
    if (worker instanceof SharedWorker) {
      this.port = worker.port;
    } else {
      this.port = worker;
    }
  }

  start() {
    if (this.port instanceof MessagePort) {
      this.port.start();
    }
    return this;
  }

  subscribe<EventType extends keyof EventTypes>(
    type: EventType,
    listener: (...args: EventTypes[EventType] extends undefined ? [] : [data: EventTypes[EventType]]) => any
  ) {
    const focusedListener = (maybeEvent: Event) => {
      const { type: actualType, data } = (maybeEvent as MessageEvent).data;
      if (actualType !== type) return; // noop on irrelevant event

      (listener as any)(data);
    };

    this.port.addEventListener("message", focusedListener);

    return () => this.port.removeEventListener("message", focusedListener);
  }

  async request<RouteType extends PickKeysByValueType<RouteTypes, RouteHandler>>(
    route: RouteType,
    ...dataList: RouteTypes[RouteType] extends RouteHandler<undefined> ? [] : RouteTypes[RouteType] extends RouteHandler<infer TIn> ? [data: TIn] : []
  ): Promise<RouteTypes[RouteType] extends RouteHandler<any, infer TOut> ? TOut : any> {
    return new Promise((resolve, reject) => {
      const nonce = crypto.randomUUID();
      const requestTimestamp = Date.now();

      const handleMessage: EventListener = (event) => {
        const { data, error, nonce: responseNonce, timestamp: responseTimestamp } = (event as MessageEvent).data;
        if (nonce !== responseNonce) return;

        this.port.removeEventListener("message", handleMessage);
        const duration = responseTimestamp - requestTimestamp;

        if (error) {
          console.error(`[request] ERR ${route as string} | ${duration}ms`, error);
          reject(error);
        } else {
          console.log(`[request] OK ${route as string} | ${duration}ms`);
          resolve(data);
        }
      };

      this.port.addEventListener("message", handleMessage);

      this.port.postMessage({
        route,
        data: dataList[0],
        nonce,
      });
    });
  }
}
