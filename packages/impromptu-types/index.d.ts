import { MappedColorNames } from "../../apps/impromptu-plugin/src/utils/colors";

export interface MessageToUI {
  selectionChanged?: SelectionSummary;
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
  webStarted?: boolean;
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
  programNodeIds: string[];
  dataNodeIds: string[];
  stickies: StickySummary[];
  primaryDataNode: PrimaryDataNodeSummary | null;
}

export interface ProgramNodeSummary {
  name: string | null;
  config: any;
}

export interface StickySummary {
  text: string;
  shortContext: string;
  longContext: string;
  url?: string;
}

export interface PrimaryDataNodeSummary {
  name: string;
  orderedStickies: {
    color: MappedColorNames;
    text: string;
    childText?: string;
    url?: string;
  }[];
}
