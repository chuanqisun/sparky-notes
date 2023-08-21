import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import { type ProxyToWeb } from "@h20/figma-tools";
import { getCurrentSelection } from "./handle-selection-change";

export async function handleGetSelectionReq(message: MessageToFigma, proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  if (!message.getSelectionReq) return;

  proxyToWeb.respond(message, { getSelectionRes: getCurrentSelection() });
}
