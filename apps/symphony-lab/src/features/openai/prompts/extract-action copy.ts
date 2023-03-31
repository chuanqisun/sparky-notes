import type { ChatMessage, OpenAIChatPayload } from "../chat";
import { parseListItem } from "../format";

export function taskInferencePrompt(text: string): [ChatMessage[], Partial<OpenAIChatPayload>] {
  return [
    [
      {
        role: "system",
        content: `I will analyze the Immediate task and Inferred Task behind a text. For example
Text: I want to create an article
Immediate task: 
- Create an article
Inferred task:
- Publish an article

Text: What is the weather like in New York?
Immediate task: 
- Get weather information for New York
Inferred task:
- Plan a trip to New York

Text: Need ideas for logo design
Immediate task:
- Generate logo design ideas
- Review an existing logo idea
Inferred task:
- Produce a logo design

Text: I am hungery
Immediate task: N/A
Inferred task:
- Find a restaurant

Text: A day on the beach might be nice
Immediate task: N/A
Inferred task:
- Find a beach nearby


Text: I am lonely
Immediate task: N/A
Inferred task:
- Contact my best friends

I alwasy respond with an unordered bullet list of independent tasks
I cannot respond with a step-by-step plan

Now provide the text. I will analyze the Immediate task and Inferred task.`,
      },
      {
        role: "user",
        content: `Text: ${text}`,
      },
    ],
    { max_tokens: 200 },
  ];
}

export function parseTaskInferenceResponse(text: string) {
  const lines = text.trim().split("\n");
  const immediateTaskIndex = lines.findIndex((line) => line.toLocaleLowerCase().startsWith("Immediate task:"));
  const inferredTaskIndex = lines.findIndex((line) => line.toLocaleLowerCase().startsWith("Inferred task:"));
  const immediateTaskLines = lines
    .slice(immediateTaskIndex + 1, inferredTaskIndex)
    .map(parseListItem)
    .filter(Boolean);
  const inferredTaskLines = lines
    .slice(inferredTaskIndex + 1)
    .map(parseListItem)
    .filter(Boolean);

  return [...immediateTaskLines, ...inferredTaskLines];
}
