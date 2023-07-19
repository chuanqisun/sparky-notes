import { getTokenCapacity } from "./capacity";
import { Poller } from "./poller";
import type { IChatTask, IChatWorker, IChatWorkerManager, IWorkerTaskRequest } from "./types";

export interface IPoller {
  // run the event handler at interval, do not start immediately
  set: (eventHandler: any) => void;
  unset: () => void;
}

export interface ChatWorkerConfig {
  models: string[];
  concurrency: number;
  tokensPerMinute: number;
}

export interface TaskRecord {
  startedAt: number;
  tokenDemand: number;
}

// Chat worker is responsible for polling task when its self has change in capacity
// Only chat manager can stop chat worker polling

export class ChatWorker implements IChatWorker {
  private tasks: IChatTask[] = [];
  private poller: IPoller;
  private previousRequest: IWorkerTaskRequest | null = null;
  private records: TaskRecord[] = [];

  constructor(private config: ChatWorkerConfig) {
    this.poller = new Poller(100);
  }

  public start(manager: IChatWorkerManager) {
    console.log(`[worker] started`);
    // poll immediately because start was requested by the manager
    this.poll(manager, this.updateTaskRequest().request);
    // start interval based polling because capacity might have changed due to timeout
    this.poller.unset();
    this.poller.set(() => {
      const taskRequestChange = this.updateTaskRequest();
      if (taskRequestChange.isChanged) {
        this.poll(manager, taskRequestChange.request);
      }
    });
  }

  public stop() {
    console.log(`[worker] stopped`);
    this.poller.unset();
  }

  private updateTaskRequest(): { isChanged: boolean; request: IWorkerTaskRequest } {
    this.updateRecordsWindow();
    const request = this.getTaskRequest();
    const isChanged = JSON.stringify(request)! == JSON.stringify(this.previousRequest);
    this.previousRequest = request;

    return { isChanged, request };
  }

  private updateRecordsWindow() {
    // remove history older than 1 min
    this.records = this.records.filter((r) => r.startedAt > Date.now() - 60 * 1000);
  }

  private getTaskRequest(): IWorkerTaskRequest {
    // Blocked due to max concurrency
    if (this.tasks.length >= this.config.concurrency) {
      return {
        tokenCapacity: 0,
        models: this.config.models,
      };
    }

    return {
      tokenCapacity: getTokenCapacity(this.config.tokensPerMinute, this.records),
      models: this.config.models,
    };
  }

  private poll(manager: IChatWorkerManager, request: IWorkerTaskRequest) {
    if (request.tokenCapacity === 0) {
      console.log(`[worker] skip poll due to 0 capacity`);
      return;
    }

    const task = manager.request(request);
    if (task) {
      console.log(`[worker] task aquired`);
      this.tasks.push(task);
      this.runTask(manager, task);
    }
    {
      console.log(`[worker] no task available`);
    }
  }

  private async runTask(manager: IChatWorkerManager, task: IChatTask) {
    // mock async run task
    this.records.push({ startedAt: Date.now(), tokenDemand: task.tokenDemand });

    await new Promise((resolve) => setTimeout(resolve, 1000));
    manager.respond(task, { output: {} as any });

    this.tasks = this.tasks.filter((t) => t !== task);

    // after each run, restart the poller because capacity might have changed
    this.start(manager);
  }
}
