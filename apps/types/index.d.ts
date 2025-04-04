export interface MessageToWeb {
  abortTask?: string;
  getSelectionRes?: SelectionSummary;
  getViewportResponse?: Viewport;
  mutationResponse?: MutationResponse;
  ping?: string;
  searchNodesByNamePattern?: SearchNodeResult[];
  selectionChanged?: SelectionSummary;
  setSelectionResponse?: string[];
}

export interface MessageToFigma {
  clearNotification?: boolean;
  detectSelection?: boolean; // request plugin to notfiy selection
  getViewport?: boolean;
  mutationRequest?: MutationRequest;
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
  cloneAndUpdateNodes?: {
    id: string;
    content: string;
  }[];
}

export interface UpdateSectionMutation {
  id: string;
  /** @default horizontal */
  flowDirection?: "horizontal" | "vertical";
  /** @default 32 */
  gap?: number;
  cloneNodes?: string[]; // ids
  moveNodes?: string[]; // ids
  cloneAndUpdateNodes?: {
    id: string;
    content: string;
  }[];
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
