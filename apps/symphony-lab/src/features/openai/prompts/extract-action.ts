import type { ChatMessage, OpenAIChatPayload } from "../chat";

export function zeroKnowledgePrompt(text: string): [ChatMessage[], Partial<OpenAIChatPayload>] {
  return [
    [
      {
        role: "system",
        content: `
Now, I will respond with a list of question`,
      },
      {
        role: "user",
        content: `Text: ${text}`,
      },
    ],
    { max_tokens: 200 },
  ];
}

export function parseZeroKnowledgeReponse(text: string) {
  return [text];
}
