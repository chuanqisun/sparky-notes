import type { MotifProgram } from "./compiler";

export interface Runtime {
  setItems: (...items: any[]) => void;
  setStatus: (status: string) => void;
  signal: AbortSignal;
}

export interface Plugin {
  operator: string;
  description?: string;
  run: (data: any[], operand: string, runtime: Runtime) => Promise<void>;
}

export interface InterpretInput {
  program: MotifProgram;
  plugins: Plugin[];
  data: any[];
  runtime: Runtime;
}

export async function run(input: InterpretInput) {
  const { program, plugins, data, runtime } = input;

  for (const statement of program.statements) {
    const libFunc = plugins.find((plugin) => plugin.operator === statement.operator);
    if (!libFunc) throw new Error(`Runtime error: "${statement.operator}" is an unknown operator`);

    await libFunc.run(data, statement.operand, runtime);
  }
}
