export interface MessageToUI {
  selectionChanged?: SelectionSummary;
  selectionChangedV2?: SelectionSummaryV2;
  started?: boolean;
  stopped?: boolean;
  logCompletionInfo?: CompletionInfoItem;
  logCompletionError?: CompletionErrorItem;
  log?: LogEntry;
}

export interface MessageToFigma {
  clear?: boolean;
  createProgram?: string;
  hitsConfig?: HitsConfig;
  programConfigChanged?: ProgramConfigSummary;
  start?: boolean;
  stop?: boolean;
}

export interface LogEntry {
  id: number;
  timestamp: number;
  type: "info" | "error";
  data: GenericLogData;
}

export interface GenericLogData {
  title: string;
  message?: string;
  [key: string]: any;
}

export interface CompletionInfoItem {
  title: string;
  prompt: string;
  completion: string;
  tokenUsage: number;
}

export interface CompletionErrorItem {
  title: string;
  prompt: string;
  error: string;
}

export interface ProgramConfigSummary {
  name: string;
  config: any;
}

export interface HitsConfig {
  accessToken: string;
}

export interface OpenAIConnection {
  completionEndpoint: string;
  apiKey: string;
}

export interface SelectionSummary {
  mode: "single" | "multiple" | "none";
  programNode?: ProgramNodeSummary;
  dataNode?: boolean;
}

export interface SelectionSummaryV2 {
  programNodeIds: string[];
  dataNodeIds: string[];
}

export interface ProgramNodeSummary {
  name: string | null;
  config: any;
}
