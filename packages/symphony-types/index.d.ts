export interface MessageToWeb {
  programSelectionChanged?: SelectedProgram[];
  respondRuntimeUpdate?: boolean;
  respondSelectedPrograms?: SelectedProgram[];
}

export interface MessageToFigma {
  injectContext?: any;
  requestCreateProgramNode?: boolean;
  requestCreateSerialTaskNodes?: CreateSerialTaskNodesInput;
  requestProgramSelection?: boolean;
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
  subtype: string;
  input: string;
}

export interface CreateSerialTaskNodesInput {
  parentId: string;
  taskDescriptions: string[];
}
