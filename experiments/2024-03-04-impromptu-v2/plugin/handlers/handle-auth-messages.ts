import type { MessageFromUI } from "../../types/message";
import type { NotifyUI } from "../lib/notify-ui";

export const handleAuthMssages = (config: { notifyUI: NotifyUI }) => async (msg: MessageFromUI) => {
  if (msg.getAccessToken === true) {
    const token = (await figma.clientStorage.getAsync("access-token")) as string | null;
    config.notifyUI({ token: token ?? "" });
  }

  if (msg.setAccessToken !== undefined) {
    await figma.clientStorage.setAsync("access-token", msg.setAccessToken);
  }
};
