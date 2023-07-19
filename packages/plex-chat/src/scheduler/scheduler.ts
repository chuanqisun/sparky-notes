import type { ModelName } from "../openai/types";

export interface IChatWorker {
  tryAssign: (task: any) => boolean;
  onDone: (eventHandler: any) => void;
  onCapacityChange: (eventHandler: any) => void;
}

export interface IChatManager {
  addWorkers: (...workers: IChatWorker[]) => void;
  submit: (task: any) => Promise<any>;
}

export interface IClock {
  start: () => void;
  stop: () => void;
  on: (eventHandler: any) => void;
}

interface ChatWorkerConfig {
  models: ModelName[];
  maxConcurrency: number;
  tokensPerMinute: number;
}

interface ChatTask {
  isDone?: boolean;
  tokensConsumed: number;
}

class ChatWorker implements IChatWorker {
  private doneHandler: any;
  private capacityChangeHandler: any;
  private pendingTasks: any[] = [];
  private clock = new Clock(100);

  constructor(private config: ChatWorkerConfig) {
    this.clock.on(() => this.cleanUp());
    this.clock.start();
  }

  public tryAssign(task: any) {
    // ref: https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/quota#understanding-rate-limits
    // check model compatibility
    // check tpm capacity (1 min window: < tpm limit)
    // check tpm capacity (10 sec window: < (tpm - consumed)/6 if not first req)
    // check tpm capacity (1 sec window: < (tpm - consumed)/60 if not first req)
    // check max parallelism

    return false;
  }

  public onDone(eventHandler: any) {
    // mark task as done

    this.doneHandler = eventHandler;
  }

  public onCapacityChange(eventHandler: any) {
    this.capacityChangeHandler = eventHandler;
  }

  private cleanUp() {
    // remove expired tasks
    // announce capacity change
  }
}

class ChatManager implements IChatManager {
  private workers: IChatWorker[] = [];
  private pendingTasks: any[] = [];
  private clock = new Clock(100);

  constructor() {
    this.clock.on(() => this.assignTasks());
  }

  public start() {
    this.clock.start();
  }

  public stop() {
    this.clock.stop();
  }

  public addWorkers(...workers: IChatWorker[]) {
    workers.forEach((worker) => {
      worker.onDone(() => {});
      worker.onCapacityChange(() => {});
      this.workers.push(worker);
    });
  }

  public async submit(task: any) {
    this.pendingTasks.push(task);
    // immediately assign new tasks
    this.assignTasks();
  }

  private assignTasks() {
    this.workers.forEach((worker) => {
      for (const task of this.pendingTasks) {
        if (worker.tryAssign(task)) {
          this.pendingTasks = this.pendingTasks.filter((t) => t !== task);
          break;
        }
      }
    });
  }
}

class Clock implements IClock {
  private isRunning = false;
  private clearHandle: any;
  private eventHandler: any;

  constructor(private interval: number) {}

  public start() {
    this.isRunning = true;
    this.tick();
  }

  private tick() {
    this.eventHandler();
    this.clearHandle = setTimeout(() => {
      if (this.isRunning) this.tick();
    }, this.interval);
  }

  public stop() {
    this.isRunning = false;
    clearTimeout(this.clearHandle);
  }

  public on(eventHandler: any) {
    this.eventHandler = eventHandler;
  }
}
