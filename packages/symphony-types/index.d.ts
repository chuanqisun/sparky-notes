export interface MessageToWeb {
  upstreamGraphChanged?: LiveProgram[];
  respondContextPath?: DisplayProgram[][];
  respondCreateProgram?: DisplayProgram;
  respondRuntimeUpdate?: boolean;
  respondUpstreamGraph?: DisplayProgram[];
}

// messages starting with "request" must be handled with "respond"
export interface MessageToFigma {
  requestContextPath?: string; // includes nodes before and above the selected node
  requestCreateProgram?: CreateProgramInput;
  requestCreateSerialTaskNodes?: CreateSerialTaskNodesInput;
  requestCreateSpatialProgram?: CreateSpatialProgramInput;
  requestRemoveDownstreamNode?: string;
  requestRuntimeUpdate?: {
    messageHandler: string;
    selectionHandler: string;
  };
  requestUpstreamGraph?: {
    leafIds: string[];
  };
  showNotification?: {
    message: string;
    config?: {
      error?: boolean;
    };
  };
  webClientStarted?: boolean;
}

export interface GraphSelection {
  nodeName: string;
}

export interface DisplayProgram {
  id: string;
  subtype: string;
  input: string;
}

export interface LiveProgram extends DisplayProgram {
  isSelected: boolean;
}

export interface CreateSerialTaskNodesInput {
  parentId: string;
  taskDescriptions: string[];
}

export interface CreateSpatialProgramInput {
  anchorId?: string;
  directionFromAnchor?: SpatialDirection;
  subtype: string;
  input: string;
}

export interface CreateProgramInput {
  parentIds: string[];
  subtype: string;
  input: string;
}

export type SpatialDirection = "Up" | "Down" | "Left" | "Right";
