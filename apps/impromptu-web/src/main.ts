import { MessageToUI } from "@impromptu/types";
import "./main.css";
import { getTokenGenerator } from "./modules/auth/token-generator";
import { notifyFigma } from "./modules/figma/rpc";
import { formToOpenAIConfig, openAIConfigToForm } from "./modules/openai/config";
import { handleSelectionChange, handleStarted, handleStopped } from "./modules/ui/command-bar";

async function main() {
  const { start: startTokenGenerator, events: tokenEvents } = getTokenGenerator();
  const openaiConfigForm = document.querySelector<HTMLFormElement>("#openai-config-form")!;
  const appMain = document.querySelector("main")!;

  const handleMainMessage = async (e: MessageEvent) => {
    const message = e.data.pluginMessage as MessageToUI;

    if (message.selectionChangedV2) {
      handleSelectionChange(message.selectionChangedV2);
    }

    if (message.started) {
      handleStarted();
    }
    if (message.stopped) {
      handleStopped();
    }
  };

  const handleHitsTokenChange = (event: Event) => {
    notifyFigma({ hitsConfig: { accessToken: (event as CustomEvent<string>).detail } });
  };

  const handleOpenaiConfigChange = () => {
    const config = formToOpenAIConfig(openaiConfigForm);
    localStorage.setItem("openai-config", JSON.stringify(config));
    notifyFigma({ openAIConfig: config });
  };

  const handleMainClick = async (e: Event) => {
    const actionTarget = (e.target as HTMLElement)?.closest("[data-action]");
    const action = actionTarget?.getAttribute("data-action");
    if (!action) return;

    console.log("[UI] action", action);

    e.preventDefault();

    switch (action) {
      case "clear": {
        notifyFigma({ clear: true });
        break;
      }
      case "createProgram": {
        notifyFigma({ createProgram: actionTarget!.getAttribute("data-create-program")! });
        break;
      }
      case "start": {
        notifyFigma({ start: true });
        break;
      }
      case "stop": {
        notifyFigma({ stop: true });
        break;
      }
    }
  };

  window.addEventListener("message", handleMainMessage);
  openaiConfigForm.addEventListener("change", handleOpenaiConfigChange);
  // hitsConfigForm.addEventListener("change", handleHitsConfigChange);
  appMain.addEventListener("click", handleMainClick);
  tokenEvents.addEventListener("token", handleHitsTokenChange);

  // initial load
  const openAIConfig = localStorage.getItem("openai-config");
  let parsedOpenAIConfig = openAIConfig ? JSON.parse(openAIConfig) : undefined;
  if (openAIConfig) openAIConfigToForm(openaiConfigForm, parsedOpenAIConfig);

  handleOpenaiConfigChange();
  startTokenGenerator();
}

main();
