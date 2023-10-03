export interface MessageToWeb {
  ping?: string;
  getSelectionRes?: SelectionSummary;
  selectionChanged?: SelectionSummary;
  parseDropHtml?: {
    items: string[];
    figmaDropContext: FigmaDropContext;
    webDragContext?: WebDragContext;
  };
  addedCards?: AddCards;
  mutationResponse?: MutationResponse;
}

export interface MessageToFigma {
  addCards?: AddCards;
  detectSelection?: boolean; // request plugin to notfiy selection
  parseHtmlLinksRes?: ParsedLink[];
  ping?: string;
  renderObject?: any;
  showNotification?: FigmaNotification;
  clearNotification?: boolean;
  mutationRequest?: MutationRequest;
}

export interface MutationRequest {
  createSections?: CreateSectionMutation[];
  updateSections?: UpdateSectionMutation[];
  removeSections?: string[];
  showSuccessMessage?: string;
  showLocator?: string;
}

export interface MutationResponse {
  createdSections: string[]; // ids
}

export interface CreateSectionMutation {
  name: string;
  moveStickies?: string[]; // move by ids
}

export interface UpdateSectionMutation {
  id: string;
  moveStickies?: string[]; // move by ids
}

export interface FigmaNotification {
  message: string;
  config?: {
    timeout?: number;
    error?: boolean;
  };
}

export interface SelectionSummary {
  contentNodes: ContentNode[];
}

export interface ContentNode {
  id: string;
  type: "sticky" | "section";
  content: string;
  children?: ContentNode[];
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
