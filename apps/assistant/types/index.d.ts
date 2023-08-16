export interface MessageToWeb {
  ping?: string;
  selectionChanged?: SelectionSummary;
  parseDropHtml?: {
    items: string[];
    figmaDropContext: FigmaDropContext;
    webDragContext?: WebDragContext;
  };
  addedCards?: AddCards;
}

export interface MessageToFigma {
  addCards?: AddCards;
  createShelf?: CreateShelf;
  disableCopilot?: boolean;
  enableCopilot?: boolean;
  parseHtmlLinksRes?: ParsedLink[];
  ping?: string;
  selectionChange?: boolean;
}

export interface CreateShelf {
  name?: string;
  rawData: string;
}

export interface SelectionSummary {
  stickies: SelectedSticky[];
  shelves: SelectedShelf[];
}

export interface SelectedSticky {
  id: string;
  text: string;
  color: string;
}

export interface SelectedShelf {
  id: string;
  name: string;
  rawData: string;
}

export interface CardData {
  category: string;
  title: string;
  entityId: string;
  entityType: number;
  url: string;
  backgroundColor: string;
}

export interface AddCards {
  cards: CardData[];
  webDragContext?: WebDragContext;
  figmaDropContext?: FigmaDropContext;
}

export interface ParsedLink {
  title: string;
  url: string;
}

export interface WebDragContext {
  offsetX: number;
  offsetY: number;
  nodeWidth: number;
  nodeHeight: number;
}

export interface FigmaDropContext {
  parentNodeId: string;
  x: number;
  y: number;
  absoluteX: number;
  absoluteY: number;
}
