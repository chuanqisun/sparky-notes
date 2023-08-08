export interface MessageToWeb {
  createStepRes?: string; // created node id
  selectionChanged?: {
    data: string; // stringified data
  };
}

// Convention: messages starting with "request" must be handled with "respond"
export interface MessageToFigma {
  createStepReq?: {};
  addStickies?: {
    parentId: string;
    items: {
      text: string;
      data?: any;
    }[];
  };
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
