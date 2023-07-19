import type { ModelName } from "../openai/types";

export interface IChatWorker {
  start: (manager: IChatManager) => void;
}

export interface IChatManager {
  // user facing
  submit: (task: any) => Promise<any>;
  addWorkers: (...workers: IChatWorker[]) => void;

  // worker facing
  requestTask: (req: any) => any | null;
  respondTask: (task: any, result: any) => void;
}

export interface IClock {
  // run the event handler every tick, start with the tick immediately
  start: (eventHandler: any) => void;
  stop: () => void;
}

interface ChatWorkerConfig {
  models: ModelName[];
  maxConcurrency: number;
  tokensPerMinute: number;
}

class ChatWorker implements IChatWorker {
  private pendingTasks: any[] = [];
  private activeClock = new Clock(100);

  constructor(private config: ChatWorkerConfig) {}

  public start(manager: IChatManager) {
    this.activeClock?.stop();
    this.activeClock.start(() => this.pollNextTask(manager));
  }

  private pollNextTask(manager: IChatManager) {
    // calculate capacity
    const task = manager.requestTask({ capacity: 999 });
    if (task) {
      this.pendingTasks.push(task);
      this.runTask(manager, task);
    }
  }

  private async runTask(manager: IChatManager, task: any) {
    // mock async run task
    await new Promise((resolve) => setTimeout(resolve, 1000));
    manager.respondTask(task, { result: "ok" });
    this.activeClock.start(() => this.pollNextTask(manager));
  }
}

// TODO request based on capacity
// ref: https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/quota#understanding-rate-limits
// check model compatibility
// check tpm capacity (1 min window: < tpm limit)
// check tpm capacity (10 sec window: < (tpm - consumed)/6 if not first req)
// check tpm capacity (1 sec window: < (tpm - consumed)/60 if not first req)
// check max parallelism

interface TaskHandle {
  task: any;
  resolve: (result: any) => void;
  reject: (error: any) => void;
  isRunning?: boolean;
  retriesLeft?: number;
}

class ChatManager implements IChatManager {
  private workers: IChatWorker[] = [];
  private taskHandles: TaskHandle[] = [];

  public addWorkers(...workers: IChatWorker[]) {
    this.workers.push(...workers);
  }

  public async submit(task: any) {
    return new Promise((resolve, reject) => {
      const taskHandles: TaskHandle = {
        task,
        resolve,
        reject,
      };
      this.taskHandles.push(taskHandles);
      this.workers.forEach((worker) => worker.start(this));
    });
  }

  public requestTask(req: any) {
    // select from pending tasks
    // assign to worker
    if (!this.taskHandles.length) return null;

    const candidateTask = this.taskHandles.at(0)!; // todo, capacity and model check
    candidateTask.isRunning = true;
    return candidateTask.task;
  }

  public respondTask(task: any, result: any) {
    const taskHandle = this.taskHandles.find((t) => t.task === task);
    if (!taskHandle) throw new Error("task not found");

    this.taskHandles = this.taskHandles.filter((t) => t !== taskHandle);
    taskHandle.resolve(result); // todo handle error
  }
}

class Clock implements IClock {
  private isRunning = false;
  private clearHandle: any;
  private eventHandler: any;

  constructor(private interval: number) {}

  public start(eventHandler: any) {
    this.stop();
    this.eventHandler = eventHandler;
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
}
