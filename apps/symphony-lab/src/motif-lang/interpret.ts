import type { MotifProgram } from "./parse";

export interface SystemApi {
  addItems: (...items: any[]) => void;
  notifyProgress: (progress: number, total: number) => void;
}

export async function interpret(program: MotifProgram, lib: any) {}
