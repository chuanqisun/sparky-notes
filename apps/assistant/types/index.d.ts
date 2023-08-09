export interface MessageToUI {
  reset?: boolean;
  ping?: string;
}

export interface MessageToMain {
  ping?: string;
  importResult?: {
    isInProgress?: boolean;
    isSuccess?: boolean;
    isError?: boolean;
  };
  addCard?: CardData;
  requestClose?: boolean;
}

export interface CardData {
  category: string;
  title: string;
  entityId: string;
  entityType: number;
  url: string;
  backgroundColor: string;
}

export interface CardMenuOptions {
  backgroundColors: ColorOption[];
}

export interface ColorOption {
  option: string;
  tooltip: string;
}
