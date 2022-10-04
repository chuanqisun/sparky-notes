import { useCallback, useEffect } from "preact/hooks";
import type { MessageToUI } from "types";
import { useHits } from "./plugins/hits/use-hits";
import { sendMessage } from "./utils/ipc";

export function App() {
  const sendToMain = useCallback(sendMessage.bind(null, import.meta.env.VITE_IFRAME_HOST_ORIGIN, import.meta.env.VITE_PLUGIN_ID), []);

  const hitsPlugin = useHits();

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

  return (
    <>
      {hitsPlugin.isConnected === undefined && <div>Signing in</div>}
      {hitsPlugin.isConnected === false && <button onClick={hitsPlugin.signIn}>Sign in</button>}
      {hitsPlugin.isConnected && (
        <div>
          <button onClick={hitsPlugin.signOut}>Sign out</button>
          <button onClick={() => hitsPlugin.pull([])}>Sync</button>
        </div>
      )}
    </>
  );
}
