export interface MessageToWeb {}

// Convention: messages starting with "request" must be handled with "respond"
export interface MessageToFigma {
  createStep?: {};
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
