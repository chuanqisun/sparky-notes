import type { MessageFromUI } from "../../types/message";

export const handleGetSelectionSummary = (props: { callback: () => any }) => async (msg: MessageFromUI) => {
  if (msg.getSelectionSummary) {
    props.callback();
  }
};
