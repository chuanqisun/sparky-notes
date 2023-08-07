export interface MessageToWeb {
  createStepRes?: string; // created node id
}

// Convention: messages starting with "request" must be handled with "respond"
export interface MessageToFigma {
  createStepReq?: {};
  selectionChanged?: true;
  showNotification?: {
    message: string;
    config?: {
      timeout?: number;
      error?: boolean;
    };
  };
  webClientStarted?: boolean;
}
