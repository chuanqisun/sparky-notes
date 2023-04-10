import type { ChatMessage, OpenAIChatPayloadWithModel } from "../../features/openai/chat";
import type { NotebookAppContext } from "../../notebook";

export interface CategorizeSupervisedInput {
  list: string[];
  labels: string[];
  onProgress?: (item: any, label: string) => any;
  isStopRequested?: () => boolean;
}

export interface CategorizationResult {
  results: string[];
  errors: string[];
}
export async function categorizeSupervised(
  context: NotebookAppContext,
  input: CategorizeSupervisedInput,
  promptConfig?: Partial<OpenAIChatPayloadWithModel>
): Promise<CategorizationResult> {
  const getMessage: (item: any) => ChatMessage[] = (item) => [
    {
      role: "system",
      content: `
You help user categorize information with the provided labels. If none of the labels fit the information, the label should be "none". e.g.
User:
{
  "object": {"name": "pizza"},
  "labels": ["food", "animal"]
}
You:
{
  "object": {"name": "pizza"},
  "reason": "pizza is an Italian flat bread with toppings, which is considered food"
  "bestLabel": "food"
}

User:
{
  "object": {"eletronicDevice": "computer"},
  "labels": ["food", "animal"]
}
You: 
{
  "object": {"eletronicDevice": "computer"},
  "reason": "computer cannot be consumed as food, and it is not an animal"
  "bestLabel": "none"
}

Your response must be valid JSON string
`,
    },
    {
      role: "user",
      content: JSON.stringify({
        object: item,
        labels: input.labels,
      }),
    },
  ];

  const categorizedList: string[] = [];
  const errors: string[] = [];

  for (const item of input.list) {
    try {
      const response = await context.getChat(getMessage(item), { max_tokens: 800, temperature: 0, ...promptConfig });
      if (input.isStopRequested?.()) {
        return {
          results: categorizedList.sort(),
          errors,
        };
      }

      const responseText = response.choices[0].message.content ?? "null";
      debugger;
      const jsonString = responseText.match(/\`\`\`json((.|\s)*?)\`\`\`/m)?.[1] ?? "{}";
      const responseObject = JSON.parse(jsonString);
      const { bestLabel } = responseObject;
      if ([...input.labels, "none"].includes(bestLabel)) {
        input.onProgress?.(item, bestLabel);
        categorizedList.push(`[${bestLabel}] ${item}`);
      } else {
        throw new Error(`Invalid label: ${bestLabel}`);
      }
    } catch (e) {
      console.error("Categorization", e);
      input.onProgress?.(item, "error");
      errors.push(item);
    }
  }

  return {
    results: categorizedList.sort(),
    errors,
  };
}
