import type { OpenAICompletionPayload } from "../completion";

export function extractActionPrompt(text: string): [string, Partial<OpenAICompletionPayload>] {
  return [
    `
Rephrase the following text to be a task statement.

Example text: I want to create an article.
Task: Create an article

Example text: What is the weather like in New York?
Task: Get weather information for New York.

Example text: Need ideas for a logo design
Task: Generate logo design ideas

Begin!
Text: ${text}
Task: `.trimStart(),
    { max_tokens: 100 },
  ];
}
