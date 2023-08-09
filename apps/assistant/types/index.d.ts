export interface MessageToWeb {
  ping?: string;
}

export interface MessageToFigma {
  ping?: string;
  addCard?: CardData;
  enableImpromptu?: boolean;
}

export interface CardData {
  category: string;
  title: string;
  entityId: string;
  entityType: number;
  url: string;
  backgroundColor: string;
}
