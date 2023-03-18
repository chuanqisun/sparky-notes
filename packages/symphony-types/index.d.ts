export interface MessageToUI {
  graphSelection?: GraphSelection;
  respondRuntimeUpdate?: boolean;
}

export interface MessageToFigma {
  injectContext?: any;
  requestRuntimeUpdate?: {
    messageHandler: string;
    selectionHandler: string;
  };
  requestGraphSelection?: boolean;
}

export interface GraphSelection {
  nodeName: string;
}
