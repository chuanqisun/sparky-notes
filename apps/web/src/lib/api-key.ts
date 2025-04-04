import { proxyToFigma } from "./proxy";

export function useApiKeyInput(input: HTMLInputElement) {
  // init with value from localStorage item "sparky-notes:openai-api-key"
  input.value = localStorage.getItem("sparky-notes:openai-api-key") ?? "";

  // when user chages the input, save to localStorage
  input.addEventListener("input", (event) => {
    const target = event.target as HTMLInputElement;
    localStorage.setItem("sparky-notes:openai-api-key", target.value);
  });
}

export function getApiKey() {
  const key = localStorage.getItem("sparky-notes:openai-api-key") ?? "";

  return key;
}

export function ensureApiKey(key?: string) {
  if (!key) {
    proxyToFigma.notify({
      showNotification: {
        message: "Please set your OpenAI API key in the settings.",
        config: { error: true },
      },
    });
    throw new Error("API key is required");
  }

  return key;
}
