export interface KeyedHandler {
  id: number;
  callback: (message?: string) => any;
}

export interface EventHandlerMap {
  tick: KeyedHandler[];
  start: KeyedHandler[];
  stop: KeyedHandler[];
}

export interface IEventLoop {
  isAborted(): boolean;
  start(): any;
  stop(): any;
}

export class AdhocEventLoop implements IEventLoop {
  private isStopRequested = false;

  isAborted(): boolean {
    return this.isStopRequested;
  }

  async start(): Promise<void> {
    this.isStopRequested = false;
  }

  async stop(message?: string | undefined): Promise<void> {
    this.isStopRequested = true;
  }
}

export class EventLoop implements IEventLoop {
  private isStopRequested = false;
  private handlerId = 0;
  private handlers: EventHandlerMap = {
    tick: [],
    start: [],
    stop: [],
  };

  isAborted() {
    return this.isStopRequested;
  }

  on(eventName: keyof EventHandlerMap, handler: () => any) {
    const id = ++this.handlerId;
    this.handlers[eventName].push({ id, callback: handler });
    return () => this.handlers[eventName].filter((existing) => existing.id !== id);
  }

  async start() {
    await this.runAllHandlersByEventName("start");
    this.isStopRequested = false;
    this.tick();
  }

  async stop(message?: string) {
    await this.runAllHandlersByEventName("stop", message);
    this.isStopRequested = true;
  }

  private async tick() {
    await this.runAllHandlersByEventName("tick");
    if (this.isStopRequested) return;
    this.tick();
  }

  private async runAllHandlersByEventName(name: keyof EventHandlerMap, message?: string) {
    return Promise.all(this.handlers[name].map((handler) => handler.callback(message)));
  }
}
