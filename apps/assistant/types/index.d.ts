export interface MessageToWeb {
  ping?: string;
  selectionChanged?: SelectionSummary;
}

export interface MessageToFigma {
  ping?: string;
  addCard?: CardData;
  enableCopilot?: boolean;
  disableCopilot?: boolean;
  selectionChange?: boolean;
}

export interface SelectionSummary {
  ids: string[];
  stickies: SelectedSticky[];
}

export interface SelectedSticky {
  id: string;
  text: string;
  color: string;
}

export interface CardData {
  category: string;
  title: string;
  entityId: string;
  entityType: number;
  url: string;
  backgroundColor: string;
}
