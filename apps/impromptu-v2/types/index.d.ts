export interface MessageToWeb {}

// messages starting with "request" must be handled with "respond"
export interface MessageToFigma {
  showNotification?: {
    message: string;
    config?: {
      timeout?: number;
      error?: boolean;
    };
  };
  webClientStarted?: boolean;
}
