import { useCallback, useEffect } from "preact/hooks";
import type { MessageToUI } from "types";
import { interactiveSignIn } from "./features/auth/auth";
import { sendMessage } from "./utils/ipc";

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

  useEffect(() => {}, []);

  const handleSignIn = () => {
    interactiveSignIn();

    // polling backend until token sign in success
  };

  return (
    <>
      <h1>hello h20</h1>
      <button onClick={handleSignIn}>Sign in</button>
    </>
  );
}
