import { GenericLogData, LogEntry } from "@impromptu/types";
import { notifyUI } from "./rpc";

export class Logger {
  private currentId = 0;

  log<T extends GenericLogData>(data: T, type: LogEntry["type"] = "info") {
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
