export interface Project {
  tools: Tool[];
  tasks: Task[];
  rootTaskId: string;
}

export interface Task {
  id: string;
  label?: string;
  known?: string[];
  unknown?: string[];
  expectation?: string[];
  output?: string[];
  observation?: string[];
  evaluation?: string[];
  parentId?: string;
  childId?: string[];
}

export interface Tool {
  id: string;
  name: string;
  description: string;
}
