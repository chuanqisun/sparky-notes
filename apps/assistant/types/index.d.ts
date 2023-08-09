export interface MessageToWeb {
  ping?: string;
}

export interface MessageToFigma {
  ping?: string;
  addCard?: CardData;
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
