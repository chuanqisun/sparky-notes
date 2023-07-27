import type { MotifProgram } from "./parse";

export interface Runtime {
  addItems: (...items: any[]) => void;
  updateStatus: (status: string) => void;
  signal: AbortSignal;
}

export interface LibraryFunction {
  operator: string;
  description?: string;
  run: (data: any[], operand: string, runtime: Runtime) => Promise<void>;
}

export interface InterpretInput {
  program: MotifProgram;
  libFunctions: Record<string, LibraryFunction>;
  data: any[];
  runtime: Runtime;
}

export async function run(input: InterpretInput) {
  const { program, libFunctions, data, runtime } = input;

  for (const statement of program.statements) {
    const libFunc = libFunctions[statement.operator];
    if (!libFunc) throw new Error(`Runtime error: "${statement.operator}" is an unknown operator`);

    await libFunc.run(data, statement.operand, runtime);
  }
}
