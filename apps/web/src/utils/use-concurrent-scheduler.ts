import { useCallback, useState } from "preact/hooks";
import { replaceArrayItem } from "./array";

export interface Task<T> {
  queueKey: string;
  itemKey: string;
  work: Promise<void>;
  isPending: boolean;
  result?: T;
  error?: any;
}

export function useConcurrentScheduler<T>() {
  const [queue, setQueue] = useState<Task<T>[]>([]);

  const resolve = useCallback((queueKey: string, itemKey: string, result?: any, error?: any) => {
    setQueue((prevQueue) => {
      const index = prevQueue.findIndex((item) => item.queueKey === queueKey && item.itemKey === itemKey);
      return index > -1 ? replaceArrayItem(prevQueue, index, { ...prevQueue[index], result, error, isPending: false }) : prevQueue;
    });
  }, []);

  const add = useCallback((queueKey: string, itemKey: string, work: Promise<T>) => {
    setQueue((prevQueue) => {
      // clear queue on key change
      const mutableQueue = prevQueue.some((item) => item.queueKey === queueKey) ? [...prevQueue] : [];
      const index = mutableQueue.findIndex((item) => item.itemKey === itemKey);

      // do not reschedule existing work
      if (index > -1) return mutableQueue;

      const wrappedWork = work
        .then((result) => {
          resolve(queueKey, itemKey, result);
        })
        .catch((error) => {
          resolve(queueKey, itemKey, undefined, error);
        });

      return [...mutableQueue, { queueKey, itemKey, work: wrappedWork, isPending: true }];
    });
  }, []);

  return {
    queue,
    add,
  };
}
