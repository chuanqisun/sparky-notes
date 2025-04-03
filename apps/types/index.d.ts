export interface MessageToWeb {
  abortTask?: string;
  addedCards?: AddCards;
  exportedNodeResponse?: ExportNodeResponse;
  getSelectionRes?: SelectionSummary;
  getViewportResponse?: Viewport;
  mutationResponse?: MutationResponse;
  parseDropHtml?: {
    items: string[];
    figmaDropContext: FigmaDropContext;
    webDragContext?: WebDragContext;
  };
  ping?: string;
  searchNodesByNamePattern?: SearchNodeResult[];
  selectionChanged?: SelectionSummary;
  setSelectionResponse?: string[];
}

export interface MessageToFigma {
  addCards?: AddCards;
  clearNotification?: boolean;
  detectSelection?: boolean; // request plugin to notfiy selection
  exportNode?: ExportNodeRequest; // request plugin to export a node by id
  getViewport?: boolean;
  mutationRequest?: MutationRequest;
  parseHtmlLinksRes?: ParsedLink[];
  ping?: string;
  renderAutoLayoutItem?: RenderAutoLayoutItem;
  renderObject?: any;
  searchNodesByNamePattern?: string;
  setSelection?: string[];
  showNotification?: FigmaNotification;
  zoomIntoViewByNames?: string[];
}

export interface Viewport {
  center: { x: number; y: number };
  bounds: { x: number; y: number; width: number; height: number };
}

export interface RenderAutoLayoutItem {
  containerName: string;
  clear?: boolean | string;
  templateName?: string;
  replacements?: { [key: string]: string };
}

export interface ExportNodeRequest {
  id: string;
}

export interface ExportNodeResponse {
  id: string;
  buffer: Uint8Array;
  format: "PNG";
}

export interface MutationRequest {
  /**
   * If not specificed, result will be centered in the viewport
   */
  position?: {
    viewportCenter?: {
      /** Percentage: -1 to 1 */
      horizontalOffset?: number;
      /** Percentage: -1 to 1 */
      verticalOffset?: number;
    };
    relativeToNodes?: {
      ids: string[];
      flowDirection?: "horizontal" | "vertical";
      gap?: number;
    };
  };
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
  /** @default horizontal */
  flowDirection?: "horizontal" | "vertical";
  /** @default 32 */
  gap?: number;
  createSummary?: string;
  cloneNodes?: string[]; // ids
  moveNodes?: string[]; // ids
}

export interface UpdateSectionMutation {
  id: string;
  /** @default horizontal */
  flowDirection?: "horizontal" | "vertical";
  /** @default 32 */
  gap?: number;
  cloneNodes?: string[]; // ids
  moveNodes?: string[]; // ids
}

export interface FigmaNotification {
  message: string;
  config?: {
    timeout?: number;
    error?: boolean;
  };
  cancelButton?: {
    label?: string;
    handle: string;
  };
  locateButton?: {
    label?: string;
    ids: string[];
  };
}

export interface SearchNodeResult {
  id: string;
  name: string;
}

export interface SelectionSummary {
  contentNodes: ContentNode[];
}

export interface ContentNode {
  id: string;
  type: "sticky" | "section" | "visual";
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
