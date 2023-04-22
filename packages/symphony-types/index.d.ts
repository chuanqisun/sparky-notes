export interface MessageToWeb {
  upstreamGraphChanged?: OperatorNode[];
  respondUpstreamOperators?: OperatorNode[];
}

// messages starting with "request" must be handled with "respond"
export interface MessageToFigma {
  createDebugOperator?: CreateDebugOperatorInput;
  requestUpstreamOperators?: {
    currentOperatorId: string;
  };
  runSelectedOperators?: RunSelectedOperatorsInput;
  setOperatorData?: SetOperatorDataInput;
  showNotification?: {
    message: string;
    config?: {
      timeout?: number;
      error?: boolean;
    };
  };
  webClientStarted?: boolean;
}

export interface CreateDebugOperatorInput {
  parentIds: string[];
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
