import type { InjectedContext } from "./utils/injected-runtime";
import { notifyUI } from "./utils/rpc";

declare var context: InjectedContext;

async function handleSelection(context: InjectedContext) {
  const nodes = figma.currentPage.selection;
  if (!nodes.length) {
    notifyUI({ graphSelection: { nodeName: "N/A" } });
  } else if (nodes.length > 1) {
    notifyUI({ graphSelection: { nodeName: "Multiple" } });
  } else {
    notifyUI({ graphSelection: { nodeName: nodes[0].name } });
  }
}

handleSelection(context);
