import { MappedColorNames } from "../../apps/impromptu-plugin/src/utils/colors";

export interface MessageToUI {
  logCompletionInfo?: CompletionInfoItem;
  logCompletionError?: CompletionErrorItem;
  log?: LogEntry;
  respondDataNodeSynthesis?: SynthesisResponse | null;
  selectionChanged?: SelectionSummary;
  started?: boolean;
  stopped?: boolean;
}

export interface MessageToFigma {
  clear?: boolean;
  createProgram?: string;
  hitsConfig?: HitsConfig;
  programConfigChanged?: ProgramConfigSummary;
  requestDataNodeSynthesis?: SynthesisRequest;
  runSelected?: {
    runnableProgramNodeIds: string[];
  };
  showNotification?: {
    message: string;
    config?: {
      timeout?: number;
      error?: boolean;
    };
  };
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

export interface SynthesisRequest {
  dataNodeId: string;
  title?: boolean;
  introduction?: boolean;
  methodology?: boolean;
}
export interface SynthesisResponse {
  title?: string;
  introduction?: string;
  methodology?: string;
  error?: string;
}

export interface SelectionSummary {
  programNodeIds: string[];
  dataNodeIds: string[];
  runnableProgramNodeIds: string[];
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
  id: string;
  name: string;
  orderedStickies: {
    color: MappedColorNames;
    text: string;
    childText?: string;
    url?: string;
  }[];
}
