import { CompletionErrorItem, CompletionInfoItem, LogItem } from "../../apps/impromptu-plugin/src/openai/completion";

export interface MessageToUI {
  selectionChanged?: SelectionSummary;
  selectionChangedV2?: SelectionSummaryV2;
  started?: boolean;
  stopped?: boolean;
  logCompletionInfo?: CompletionInfoItem;
  logCompletionError?: CompletionErrorItem;
  log?: LogItem;
}

export interface MessageToFigma {
  clear?: boolean;
  createProgram?: string;
  hitsConfig?: HitsConfig;
  programConfigChanged?: ProgramConfigSummary;
  start?: boolean;
  stop?: boolean;
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
