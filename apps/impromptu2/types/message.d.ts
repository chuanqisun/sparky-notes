export interface MessageFromUI {
  addTool?: AddTool;
  getAccessToken?: boolean;
  setAccessToken?: string;
  getNodeBlobById?: string; // connect with nodeBlobChange stream
  getSelectionSummary?: boolean;
  setNodeBlob?: SetNodeBlob;
}

export interface MessageFromFigma {
  token?: string;
  selectionChange?: SelectionSummary;
  nodeBlob?: NodeBlob; // deprecate
  nodeBlobChanges?: NodeBlob[];
}

export interface SetNodeBlob {
  id: string;
  blob: string;
}

export interface AddTool {
  displayName: string;
  blob: string;
}

export interface NodeBlobChange {
  id: string;
  blob: string;
}

export interface NodeBlob {
  id: string;
  blob: string;
}

export interface SelectionSummary {
  toolNodes: ToolNodeSummary[];
  dataNodes: any[];
}

export interface ToolNodeSummary {
  id: string;
}
