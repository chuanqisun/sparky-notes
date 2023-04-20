export interface MessageToWeb {
  upstreamGraphChanged?: OperatorNode[];
  respondUpstreamGraph?: OperatorNode[];
}

// messages starting with "request" must be handled with "respond"
export interface MessageToFigma {
  createDebugOperator?: CreateDebugOperatorInput;
  requestUpstreamGraph?: {
    leafIds: string[];
  };
  runSelectedOperators?: RunSelectedOperatorsInput;
  setOperatorData?: SetOperatorDataInput;
  showNotification?: {
    message: string;
    config?: {
      error?: boolean;
    };
  };
  webClientStarted?: boolean;
}

export interface CreateDebugOperatorInput {
  name: string;
  config: string;
  data: string;
}

export interface RunSelectedOperatorsInput {
  nodeIds: string[];
}
export interface SetOperatorDataInput {
  id: string;
  data: string;
}

export interface OperatorNode {
  id: string;
  name: string;
  config: string;
  data: string;
  isSelected?: boolean;
}
