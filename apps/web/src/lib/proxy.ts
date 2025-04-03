import type { MessageToFigma, MessageToWeb } from "@sticky-plus/figma-ipc-types";
import { getProxyToFigma, type ProxyToFigma } from "@sticky-plus/figma-tools";

export type IProxyToFigma = ProxyToFigma<MessageToFigma, MessageToWeb>;
export const proxyToFigma: IProxyToFigma = getProxyToFigma(import.meta.env.VITE_PLUGIN_ID);
