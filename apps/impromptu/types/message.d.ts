export interface MessageFromUI {
  getAccessToken?: boolean;
  setAccessToken?: string;
  getNodeBlobById?: string; // connect with nodeBlobChange stream
  getSelectionSummary?: boolean;
  createDataNode?: CreateDataNode;
}

export interface MessageFromFigma {
  token?: string;
  selectionChange?: SelectionSummary;
}

export interface SelectionSummary {
  dataNodes: any[];
}

export interface CreateDataNode {
  displayName: string;
  blob: string;
}
