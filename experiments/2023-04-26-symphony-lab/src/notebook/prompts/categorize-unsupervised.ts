import type { ChatMessage, OpenAIChatPayloadWithModel } from "../../features/openai/chat";
import type { NotebookAppContext } from "../../notebook";

export interface CategorizeUnsupervisedInput {
  list: string[];
  basedOn: string;
  idealCategoryCount: number;
  onProgress?: (item: any, label: string) => any;
  isStopRequested?: () => boolean;
}

export interface TreeNode {
  data: string;
  children: TreeNode[];
}

export async function categorizeUnsupervised(
  context: NotebookAppContext,
  input: CategorizeUnsupervisedInput,
  promptConfig?: Partial<OpenAIChatPayloadWithModel>
): Promise<TreeNode[]> {
  const getMessage: (item: any) => ChatMessage[] = (item) => [
    {
      role: "system",
      content: `
You help user categorize information into ${input.idealCategoryCount} groups based on ${input.basedOn}. For example:
User:
{
  "uncategorizedList": ["pizze", "dog",  "book", "car", "computer"],
  "basedOn": "size",
  "idealCategoryCount": 3,
}
You:
{
  "observation": "The size of the provided object range from small to medium to large",
  "categorizedList": [
      {
        "catetory": "small",
        "items": ["pizza", "book"]
      },
      {
        "category": "medium",
        "items": ["dog", "computer"]
      },
      {
        "cateogry": "large",
        "items": ["car"]
      }
  ]
}

Your response must be a valid JSON string
`,
    },
    {
      role: "user",
      content: JSON.stringify({
        uncategorizedList: {
          object: input.list,
        },
        basedOn: input.basedOn,
        idealCategoryCount: 3,
      }),
    },
  ];

  try {
    const response = await context.getChat(getMessage(input.list), { max_tokens: 8000, temperature: 0, model: "v4-32k", ...promptConfig });
    if (input.isStopRequested?.()) {
      return [];
    }

    const responseText = response.choices[0].message.content ?? "null";
    const responseObject = JSON.parse(responseText);
    const { categorizedList } = responseObject;

    const nodes = categorizedList.map((listItem: any) => ({
      data: listItem.category,
      children: listItem.items,
    }));

    return nodes;
  } catch (e) {
    console.error("Unsupervised categorization error", e);
    return [];
  }
}
