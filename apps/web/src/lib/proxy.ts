import type { MessageToFigma, MessageToWeb } from "@sparky-notes/figma-ipc-types";
import { getProxyToFigma, type ProxyToFigma } from "@sparky-notes/figma-tools";

export type IProxyToFigma = ProxyToFigma<MessageToFigma, MessageToWeb>;
export const proxyToFigma: IProxyToFigma = getProxyToFigma(import.meta.env.VITE_PLUGIN_ID);
