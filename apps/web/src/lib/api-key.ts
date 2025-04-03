export function useApiKeyInput(input: HTMLInputElement) {
  // init with value from localStorage item "sticky-plus:openai-api-key"
  input.value = localStorage.getItem("sticky-plus:openai-api-key") ?? "";

  // when user chages the input, save to localStorage
  input.addEventListener("input", (event) => {
    const target = event.target as HTMLInputElement;
    localStorage.setItem("sticky-plus:openai-api-key", target.value);
  });
}

export function getApiKey() {
  const key = localStorage.getItem("sticky-plus:openai-api-key");
  if (!key) throw new Error("API key is not set");
  return key;
}
