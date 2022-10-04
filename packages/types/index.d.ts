export interface MessageToUI {
  reset?: boolean;
  ping?: string;
}

export interface MessageToMain {
  ping?: string;
  addCard?: {
    title: string;
    url?: string;
  };
}
