export type AsyncResponse<T> = Promise<{
  status: number;
  data?: T;
}>;
