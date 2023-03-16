import { notifyUI } from "./rpc";

export interface LogEntry {
  id: number;
  timestamp: number;
  type: "info" | "error";
  data: GenericLogData;
}

export interface GenericLogData {
  title: string;
  message?: string;
  [key: string]: any;
}

export class Logger {
  private currentId = 0;

  log<T>(data: T, type: LogEntry["type"] = "info") {
    if (++this.currentId === Number.MAX_SAFE_INTEGER) {
      this.currentId = 1;
    }

    notifyUI({
      log: {
        id: this.currentId,
        timestamp: Date.now(),
        type,
        data,
      },
    });
  }
}
