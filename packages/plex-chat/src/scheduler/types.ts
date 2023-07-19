import type { ChatInput, ChatOutput } from "../openai/types";

export interface IChatWorker {
  start: (manager: IChatWorkerManager) => void;
}

export interface IChatWorkerManager {
  requestTask: (req: IWorkerTaskRequest) => IChatTask | null;
  respondTask: (task: IChatTask, result: IWorkerTaskResult) => void;
}

export interface IWorkerTaskRequest {
  tokenLimit: number;
  models: string[];
}

export interface IWorkerTaskResult {
  output: ChatOutput;
  error?: any;
}

export interface IChatTask extends ChatInput {
  models: string[];
}

export interface IChatTaskManager {
  submit: (task: IChatTask) => Promise<ChatOutput>;
}
