export interface MessageToWeb {}

// messages starting with "request" must be handled with "respond"
export interface MessageToFigma {
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
