export interface Project {
  tools: Tool[];
  tasks: Task[];
  connections: TaskConnection[];
}

export interface Task {
  id: string;
  label: string;
  known?: string[];
  unknown?: string[];
  expectation?: string[];
  output?: string[];
  observation?: string[];
  evaluation?: string[];
}

export interface Tool {
  id: string;
  name: string;
  description: string;
}

export interface TaskConnection {
  id: string;
  source: string;
  target: string;
  type: "order" | "hierarchy";
}
