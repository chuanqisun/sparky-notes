import { useApiKeyInput } from "./lib/api-key";
import { useAutoFill } from "./lib/auto-fill";
import { runGenerate } from "./lib/generate";
import { runGroup } from "./lib/group";
import { runItemize } from "./lib/itemize";
import { useSelection } from "./lib/selection";
import { useTaskControl } from "./lib/task";
import "./style.css";

useAutoFill();
useApiKeyInput(document.querySelector(`input[name="openai-api-key"]`) as HTMLInputElement);
useSelection();
useTaskControl();

window.addEventListener("submit", (event) => {
  event?.preventDefault();
  const form = event.target as HTMLFormElement;
  const formName = form.name;
  switch (formName) {
    case "generate": {
      runGenerate();
      break;
    }
    case "itemize": {
      runItemize();
      break;
    }
    case "group": {
      runGroup();
      break;
    }
  }
});
