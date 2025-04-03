import { useApiKeyInput } from "./lib/api-key";
import "./style.css";

useApiKeyInput(document.querySelector(`input[name="openai-api-key"]`) as HTMLInputElement);
