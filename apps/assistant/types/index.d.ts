export interface MessageToWeb {
  ping?: string;
  selectionChanged?: SelectionSummary;
  dropHtml?: {
    items: string[];
    figmaDropContext: FigmaDropContext;
    webDragContext?: WebDragContext;
  };
}

export interface MessageToFigma {
  createCard?: CreateCardSummary;
  disableCopilot?: boolean;
  enableCopilot?: boolean;
  parseHtmlLinksRes?: ParsedLink[];
  ping?: string;
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

export interface CreateCardSummary {
  data: CardData;
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
