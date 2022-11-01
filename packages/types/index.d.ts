export interface MessageToUI {
  reset?: boolean;
  ping?: string;
  openUrl?: string;
}

export interface MessageToMain {
  ping?: string;
  importResult?: {
    isInProgress?: boolean;
    isSuccess?: boolean;
    isError?: boolean;
  };
  addCard?: {
    title: string;
    entityType: number;
    url: string;
  };
  requestClose?: boolean;
}
