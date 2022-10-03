import { useCallback, useEffect } from "preact/hooks";
import type { MessageToUI } from "types";
import { interactiveSignIn } from "./features/auth/auth";
import { sendMessage } from "./utils/ipc";

const links = {
  submitAvatar: "https://github.com/chuanqisun/pixel-pusher-online#avatar-design-requirement",
  submitMap: "https://github.com/chuanqisun/pixel-pusher-online#map-design-requirement",
  license: "https://github.com/chuanqisun/pixel-pusher-online#licenses-and-credits",
  issue: "https://github.com/chuanqisun/pixel-pusher-online/issues",
};

export function App() {
  const sendToMain = useCallback(sendMessage.bind(null, import.meta.env.VITE_IFRAME_HOST_ORIGIN, import.meta.env.VITE_PLUGIN_ID), []);

  useEffect(() => {
    const handleMainMessage = (e: MessageEvent) => {
      const pluginMessage = e.data.pluginMessage as MessageToUI;
      console.log(`[ipc] Main -> UI`, pluginMessage);

      if (pluginMessage.reset) {
        localStorage.clear();
        location.reload();
      }
    };

    window.addEventListener("message", handleMainMessage);

    return () => window.removeEventListener("message", handleMainMessage);
  }, []);

  const handleSignIn = () => {
    interactiveSignIn();
  };

  return (
    <>
      <h1>hello h20</h1>
      <button onClick={handleSignIn}>Sign in</button>
    </>
  );
}
