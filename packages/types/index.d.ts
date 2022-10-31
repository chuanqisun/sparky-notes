export interface MessageToUI {
  reset?: boolean;
  ping?: string;
  openUrl?: string;
}

export interface MessageToMain {
  ping?: string;
  importResult?: {
    isSuccess?: boolean;
  };
  addCard?: {
    title: string;
    entityType: number;
    url: string;
  };
  requestClose?: boolean;
}
