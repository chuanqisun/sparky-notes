import type { ChatMessage, OpenAIChatPayloadWithModel } from "../../features/openai/chat";
import type { NotebookAppContext } from "../../notebook";

export interface FilterInput {
  list: string[];
  predicate: string;
  onProgress?: (item: any, answer: "yes" | "no" | "error") => any;
  isNegated?: boolean;
}
export interface FilterResult {
  yes: string[];
  no: string[];
  error: string[];
}
export async function filter(context: NotebookAppContext, input: FilterInput, promptConfig?: Partial<OpenAIChatPayloadWithModel>): Promise<FilterResult> {
  const getMessage: (item: any) => ChatMessage[] = (item) => [
    {
      role: "system",
      content: `
User will provide you with a json object and a Yes/No predicate question. You provide the answer in a single word "Yes" or "No", with no additional explanation. For example:
Input:
\`\`\`json
{
  "object": {"name": "pizza"},
  "predicateQuestion": "Is it food?"
}
Output: Yes

Input:
\`\`\`json
{
  "object": {"concept": "puzzy"},
  "predicateQuestion": "Is it a plant?"
}
Output: No`,
    },
    {
      role: "user",
      content: `Input:
\`\`\`json
${JSON.stringify({
  object: item,
  predicate: input.predicate,
})}
\`\`\`

Output: `,
    },
  ];

  const yes: any[] = [];
  const no: any[] = [];
  const error: any[] = [];

  for (const item of input.list) {
    try {
      const response = await context.getChat(getMessage(item), { max_tokens: 100, temperature: 0, ...promptConfig });
      const responseText = response.choices[0].message.content ?? "";
      if (responseText.toLocaleLowerCase().includes("yes")) {
        input.onProgress?.(item, "yes");
        yes.push(item);
      } else if (responseText.toLocaleLowerCase().includes("no")) {
        input.onProgress?.(item, "no");
        no.push(item);
      } else {
        error.push(item);
        input.onProgress?.(item, "error");
      }
    } catch (e) {
      console.error("Filter tool error", e);
      error.push(item);
      input.onProgress?.(item, "error");
    }
  }

  return {
    yes,
    no,
    error,
  };
}
