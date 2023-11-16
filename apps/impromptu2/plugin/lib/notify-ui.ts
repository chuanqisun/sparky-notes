import type { MessageFromFigma } from "../../types/message";

export type NotifyUI = (message: MessageFromFigma) => void;
export const getUINotifier = () => (message: MessageFromFigma) => figma.ui.postMessage(message);
