import type { MotifProgram } from "@h20/motif-lang";

export interface Runtime<T = any> {
  getItem: () => T[];
  setItems: (items: T[]) => void;
  setShelfName: (title: string) => void;
  getShelfName: () => string;
  deleteShelf: () => void;
  setStatus: (status: string) => void;
  signal: AbortSignal;
}

export interface RuntimePlugin<T> {
  operator: string;
  description?: string;
  run: (operand: string, runtime: T) => Promise<void>;
}

export interface InterpretInput<T> {
  program: MotifProgram;
  plugins: RuntimePlugin<T>[];
  runtime: T;
}

export async function run<T>(input: InterpretInput<T>) {
  const { program, plugins, runtime } = input;

  for (const statement of program.statements) {
    const libFunc = plugins.find((plugin) => plugin.operator === statement.operator);
    if (!libFunc) throw new Error(`Runtime error: "${statement.operator}" is an unknown operator`);

    await libFunc.run(statement.operand, runtime);
  }
}
