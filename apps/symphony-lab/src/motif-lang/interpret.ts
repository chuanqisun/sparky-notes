import type { MotifProgram } from "./parse";

export interface SystemApi {
  addItems: (...items: any[]) => void;
  notifyProgress: (progress: number, total: number) => void;
}

export interface RunContext {
  system: SystemApi;
}
export interface LibraryFunction {
  operator: string;
  description?: string;
  run: (data: any[], operand: string, context: RunContext) => Promise<void>;
}

export async function interpret(program: MotifProgram, libFunctions: Record<string, LibraryFunction>, data: any[]) {
  for (const statement of program.statements) {
    const libFunc = libFunctions[statement.operator];
    if (!libFunc) throw new Error(`Unknown operator: "${statement.operator}"`);

    await libFunc.run(data, statement.operand, {
      system: {
        addItems: (...items) => console.log("TODO, implement add items", items),
        notifyProgress: (progress, total) => console.log("TODO, implement notify progress", progress, total),
      },
    });
  }
}
