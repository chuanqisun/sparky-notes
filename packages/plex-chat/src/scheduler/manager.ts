import type { ChatOutput } from "../openai/types";
import type { IChatTask, IChatTaskManager, IChatWorker, IChatWorkerManager, IWorkerTaskRequest, IWorkerTaskResponse } from "./types";

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
      const taskHandle: TaskHandle = {
        task,
        resolve,
        reject,
      };
      this.taskHandles.push(taskHandle);
      console.log(`[manager] dispatch ${this.taskHandles.length} tasks to ${this.workers.length} workers`);
      this.workers.forEach((worker) => worker.start(this));
    });
  }

  public request(req: IWorkerTaskRequest): IChatTask | null {
    if (!this.taskHandles.length) {
      console.log(`[manager] all tasks completed, stopping workers`);
      this.workers.forEach((worker) => worker.stop());
      return null;
    }

    // todo, capacity and model check
    const availableTasks = this.taskHandles.filter((t) => !t.isRunning);
    console.log(`[manager] ${availableTasks.length} tasks available`);

    if (!availableTasks.length) {
      return null;
    }

    const candidateTask = availableTasks.at(0)!;
    candidateTask.isRunning = true;

    return candidateTask.task;
  }

  public respond(task: IChatTask, result: IWorkerTaskResponse) {
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
