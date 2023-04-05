import type { ChatMessage } from "../chat";

export function goalExtractionPrompt(text: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: `
I will infer the goals behind the text`,
    },
    {
      role: "user",
      content: `Text: ${text}`,
    },
  ];
}
