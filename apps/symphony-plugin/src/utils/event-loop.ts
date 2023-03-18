export interface KeyedHandler {
  id: number;
  callback: (message?: string) => any;
}

export interface EventHandlerMap {
  tick: KeyedHandler[];
  start: KeyedHandler[];
  stop: KeyedHandler[];
}

export class EventLoop {
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
