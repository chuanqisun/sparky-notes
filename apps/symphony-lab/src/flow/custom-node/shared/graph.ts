import type { ChatProxy } from "../../../account/model-selector";
import type { Cozo } from "../../../cozo/cozo";
import type { SemanticSearchProxy } from "../../../hits/search-claims";

export interface NodeContext {
  chat: ChatProxy;
  graph: Cozo;
  searchClaims: SemanticSearchProxy;
  selectNode: () => void;
  getInputs: () => GraphOutputItem[][];
  onSelectOutput: (id: string) => any;
}

export interface NodeData<T = any> {
  context: NodeContext;
  taskIds: string[];
  output: any[];
  viewModel: T;
  setViewModel: (data: T) => void;
  setOutput: (output: any[]) => void;
  setTaskOutputs: (taskId: string, items: GraphOutputItem[]) => void;
  setTask: (taskId: string, data: GraphTaskData) => void;
  clearTaskOutputs: () => void;
  appendOutput: (output: any) => void;
}

export interface GraphOutputItem {
  sourceIds: string[];
  id: string;
  position: number;
  data: any;
}

export interface GraphTaskData {
  name: string;
}
