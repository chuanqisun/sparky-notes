export interface MessageToUI {
  reset?: boolean;
  ping?: string;
}

export interface MessageToMain {
  ping?: string;
  importResult?: {
    isSuccess?: boolean;
  };
  addCard?: {
    title: string;
    url?: string;
  };
}
