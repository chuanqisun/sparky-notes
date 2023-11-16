import { type ChatOutput, type SimpleChatInput, type SimpleChatProxy } from "plexchat";
import { map, tap } from "rxjs";
import type { MessageFromFigma, MessageFromUI } from "../types/message";
import { useActiveTool } from "./lib/active-tool";
import { useAppMenu } from "./lib/app-menu";
import { useAuthForm } from "./lib/auth/use-auth-form";
import { getFigmaProxy } from "./lib/figma-proxy";
import { $focusOnce } from "./lib/focus-window";
import { getH20Proxy } from "./lib/h20-proxy";
import { useToolsMenu } from "./lib/tools-menu";
import { createChat } from "./lib/tools/chat/chat";
import { createConceptSearch } from "./lib/tools/concept-search";
import { createNoTool } from "./lib/tools/no-tool";
import "./style.css";

const { $tx, $rx } = getFigmaProxy<MessageFromUI, MessageFromFigma>(window);
$rx.pipe(tap((msg) => console.log(`[debug] msg from figma`, msg))).subscribe();

$tx.next({ getAccessToken: true, getSelectionSummary: true });

$focusOnce(window).subscribe();

const { $isTokenValid, $validToken } = useAuthForm({
  $rx,
  $tx,
  container: document.getElementById("auth-form-container")!,
});

const $chatProxy = $validToken.pipe(
  map((token) => getH20Proxy(token)),
  map((h20proxy) => {
    const chatProxy: SimpleChatProxy = (input: SimpleChatInput) => h20proxy<SimpleChatInput, ChatOutput>("/openai/plexchat", input);
    return chatProxy;
  })
);

useAppMenu({ container: document.getElementById("app-menu") as HTMLDetailsElement, $isTokenValid });
useToolsMenu({ $tx, container: document.getElementById("tools-menu-container") as HTMLElement });
useActiveTool({
  $rx,
  $tx,
  container: document.getElementById("active-tool-container")!,
  tools: {
    chat: createChat({ $chatProxy }),
    conceptSearch: createConceptSearch(),
    noTool: createNoTool(),
  },
});

// Communicate with Figma
