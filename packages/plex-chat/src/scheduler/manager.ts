import type { ChatOutput } from "../openai/types";
import type { IChatTask, IChatTaskManager, IChatWorker, IChatWorkerManager, IWorkerTaskRequest, IWorkerTaskResult } from "./types";

interface TaskHandle {
  task: IChatTask;
  resolve: (result: ChatOutput) => void;
  reject: (error: any) => void;
  isRunning?: boolean;
  retriesLeft?: number;
}

export class ChatManager implements IChatTaskManager, IChatWorkerManager {
  private taskHandles: TaskHandle[] = [];

  constructor(private workers: IChatWorker[]) {}

  public async submit(task: IChatTask) {
    return new Promise<ChatOutput>((resolve, reject) => {
      const taskHandles: TaskHandle = {
        task,
        resolve,
        reject,
      };
      this.taskHandles.push(taskHandles);
      this.workers.forEach((worker) => worker.start(this));
    });
  }

  public requestTask(req: IWorkerTaskRequest): IChatTask | null {
    if (!this.taskHandles.length) return null;

    const candidateTask = this.taskHandles.at(0)!; // todo, capacity and model check
    candidateTask.isRunning = true;
    return candidateTask.task;
  }

  public respondTask(task: IChatTask, result: IWorkerTaskResult) {
    const taskHandle = this.taskHandles.find((t) => t.task === task);
    if (!taskHandle) throw new Error("task not found");

    this.taskHandles = this.taskHandles.filter((t) => t !== taskHandle);
    if (result.error) {
      taskHandle.reject(result.error); // todo handle error and retry
    } else {
      taskHandle.resolve(result.output);
    }
  }
}
