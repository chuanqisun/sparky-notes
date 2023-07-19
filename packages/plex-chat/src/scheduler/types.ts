import type { ChatInput, ChatOutput } from "../openai/types";

export interface IChatTaskManager {
  submit: (task: IChatTask) => Promise<ChatOutput>;
}

export interface IChatWorkerManager {
  request: (request: IWorkerTaskRequest) => IChatTask | null;
  respond: (task: IChatTask, response: IWorkerTaskResponse) => void;
}

export interface IWorkerTaskRequest {
  tokenLimit: number;
  models: string[];
}

export interface IWorkerTaskResponse {
  output: ChatOutput;
  error?: any;
}

export interface IChatTask extends ChatInput {
  models: string[];
}

export interface IChatWorker {
  start: (manager: IChatWorkerManager) => void;
  stop: () => void;
}
