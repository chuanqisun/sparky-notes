export interface MessageToWeb {
  upstreamGraphChanged?: OperatorNode[];
  respondUpstreamGraph?: OperatorNode[];
}

// messages starting with "request" must be handled with "respond"
export interface MessageToFigma {
  notifyCreateDebugOperator?: CreateDebugOperatorInput;
  notifyRunSelectedOperators?: RunSelectedOperatorsInput;
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

export interface CreateDebugOperatorInput {
  name: string;
  config: Record<string, any>;
  data: any[];
}

export interface RunSelectedOperatorsInput {
  nodeIds: string[];
}

export interface OperatorNode {
  id: string;
  name: string;
  config: Record<string, any>;
  data: any[];
  isSelected?: boolean;
}
