export interface MessageToUI {
  graphSelection?: GraphSelection;
  respondRuntimeUpdate?: boolean;
  respondSelectedPrograms?: SelectedProgram[];
}

export interface MessageToFigma {
  injectContext?: any;
  requestCreateProgramNode?: boolean;
  requestCreateSerialTaskNodes?: CreateSerialTaskNodesInput;
  requestGraphSelection?: boolean;
  requestRemoveDownstreamNode?: string;
  requestRuntimeUpdate?: {
    messageHandler: string;
    selectionHandler: string;
  };
  requestSelectedPrograms?: boolean;
}

export interface GraphSelection {
  nodeName: string;
}

export interface SelectedProgram {
  id: string;
  input: string;
}

export interface CreateSerialTaskNodesInput {
  parentId: string;
  taskDescriptions: string[];
}
