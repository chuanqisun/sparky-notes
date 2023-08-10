export interface MessageToWeb {
  ping?: string;
  selectionChanged?: SelectionSummary;
}

export interface MessageToFigma {
  ping?: string;
  addCard?: CardData;
  dropCard?: DropCardSummary;
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

export interface DropCardSummary {
  data: CardData;
  dragEvent: SyntheticDragEvent;
}

export interface SyntheticDragEvent {
  offsetX: number;
  offsetY: number;
  nodeWidth: number;
  nodeHeight: number;
}
