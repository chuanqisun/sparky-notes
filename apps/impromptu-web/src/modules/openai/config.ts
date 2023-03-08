export interface OpenAIConfig {
  completionEndpoint: string;
  apiKey: string;
}

export function formToOpenAIConfig(form: HTMLFormElement): OpenAIConfig {
  const formData = new FormData(form);
  return {
    apiKey: formData.get("apiKey") as string,
    completionEndpoint: formData.get("completionEndpoint") as string,
  };
}

export function openAIConfigToForm(form: HTMLFormElement, connection: Partial<OpenAIConfig>) {
  if (connection.apiKey) {
    form.querySelector<HTMLInputElement>(`[name="apiKey"]`)!.value = connection.apiKey;
  }

  if (connection.completionEndpoint) {
    form.querySelector<HTMLInputElement>(`[name="completionEndpoint"]`)!.value = connection.completionEndpoint;
  }
}
