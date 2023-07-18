// ref: https://learn.microsoft.com/en-us/azure/cognitive-services/openai/reference
export interface ChatInput {
  messages: ChatMessage[];
  /**
   * Pending support: https://stackoverflow.com/questions/76543136/how-to-do-function-calling-using-azure-openai
   */
  functions?: FunctionDefinition[];
  function_call?: "auto" | "none" | { name: string };
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  max_tokens: number;
  stop: null | string | string[];
}

export interface ChatMessage {
  role: "assistant" | "system" | "user";
  content: string;
}

export interface FunctionDefinition {
  name: string;
  description?: string;
  parameters: any;
}

export type ChatOutput = {
  choices: {
    finish_reason: "stop" | "length" | "content_filter" | null;
    index: number;
    message: {
      content?: string; // blank when content_filter is active
      role: "assistant";
    };
  }[];
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
};
