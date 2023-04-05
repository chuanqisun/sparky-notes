import type { ChatMessage } from "../chat";

export function questionExtractionPrompt(text: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: `
I will infer the questions behind the text`,
    },
    {
      role: "user",
      content: `Text: ${text}`,
    },
  ];
}
