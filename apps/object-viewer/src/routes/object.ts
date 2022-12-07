import assert from "assert";
import type { Request } from "express";

export type Response<T> = Promise<{
  status: number;
  data?: T;
}>;

export async function getReport(req: Request): Response<HitsObject> {
  const idStr = req.params.id;
  const id = parseInt(idStr);
  assert(!Number.isNaN(id));

  return {
    status: 200,
    data: {},
  };
}

export type HitsObject = {};
