import { useCallback, useState } from "preact/hooks";
import { replaceArrayItem } from "./array";

interface TaskInternal<T> {
  queueKey: string;
  itemKey: string;
  workPromise: Promise<void>;
  isPending: boolean;
  result?: T;
  error?: any;
}

export interface Task<T> {
  queueKey: string;
  itemKey: string;
  work: () => Promise<T>;
}

export function useConcurrentTasks<T>() {
  const [queue, setQueue] = useState<TaskInternal<T>[]>([]);

  const resolve = useCallback((queueKey: string, itemKey: string, result?: any, error?: any) => {
    setQueue((prevQueue) => {
      const index = prevQueue.findIndex((item) => item.queueKey === queueKey && item.itemKey === itemKey);
      return index > -1 ? replaceArrayItem(prevQueue, index, { ...prevQueue[index], result, error, isPending: false }) : prevQueue;
    });
  }, []);

  const add = useCallback(({ queueKey, itemKey, work }: Task<T>) => {
    setQueue((prevQueue) => {
      // clear queue on key change
      const mutableQueue = prevQueue.filter((item) => item.queueKey === queueKey);
      const index = mutableQueue.findIndex((item) => item.itemKey === itemKey);

      // do not reschedule existing work
      if (index > -1) return mutableQueue;

      const workPromise = work()
        .then((result) => {
          resolve(queueKey, itemKey, result);
        })
        .catch((error) => {
          resolve(queueKey, itemKey, undefined, error);
        });

      return [...mutableQueue, { queueKey, itemKey, workPromise, isPending: true }];
    });
  }, []);

  return {
    queue,
    add,
  };
}
