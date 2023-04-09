import type { ChatMessage, OpenAIChatPayloadWithModel } from "../../features/openai/chat";
import type { AppContext } from "../../notebook";

export async function analyzeTask(context: AppContext, input: string, promptConfig?: Partial<OpenAIChatPayloadWithModel>): Promise<string> {
  const probeMessages: ChatMessage[] = [
    {
      role: "system",
      content: `
You are a planning assistant who is rational, efficient, and effective. You have access to the following tools:
- web_search // Search the web for unverified information. Input must be plaintext query
- filter_out // Throw away information by a criterion. Input must be a Yes/No question. The Yes results will be thrown away
- filter_in // Keep information by a criterion. Input must be a Yes/No question. The Yes results will be kept
- categorize // Categorize information into groups. Input must be either a list of category names, or a criterion/aspect for categorization
- summarize // Reduce the information. Input must be empty string
- sort // Order information based on a criterion. Input must be the criterion and the direction (ascending or descending)

Now choose a chain of tools to perform the task described by the user. You can only respond in the following format:
Task name: Summarize Task description into short name
Task analysis: Describe what goal of the task, the expected outcome
Ideal tool: The ideal tool regardless of what is available for such task
Realistic tool chain exists (Y/N)?: Is it possible build the ideal tool from [web_search, filter_out, filter_in, categorize, summarize, sort]?
Tool chain json: (only when tool chain exists)
\`\`\`
[
  {
    "tool": "web_search" | "filter" | "categorize" "summarize" | "sort",
    "input": string,
    "stepDisplayName": string, // Describe the step with a human readable label
  },
  // ... repeat for each tool in the chain
]
\`\`\`
`,
    },
    {
      role: "user",
      content: `Task description: ${input}`,
    },
  ];

  const response = await context.getChat(probeMessages, { max_tokens: 250, temperature: 0.25, stop: "Output:", ...promptConfig });

  return response.choices[0].message.content;
}
