import type { ChatMessage, OpenAIChatPayloadWithModel } from "../../features/openai/chat";
import type { NotebookAppContext } from "../../notebook";
import type { Step } from "./tool-v2";
import toolDef from "./tool-v2.d.ts?raw";

export interface AnalyzeStepInput {
  previousSteps: Pick<Step, "name" | "analysis" | "chosenTool" | "toolInput">[];
  stepDescription: string;
}
export async function analyzeStep(
  context: NotebookAppContext,
  input: AnalyzeStepInput,
  promptConfig?: Partial<OpenAIChatPayloadWithModel>
): Promise<Step | null> {
  const probeMessages: ChatMessage[] = [
    {
      role: "system",
      content: `
You are a rational, efficient, and effective assistant to help user implement a step with the best tool. The step and tools are defined as such:
\`\`\`typescript
${toolDef}
\`\`\`

Partial summary of previous steps:
\`\`\`json
${JSON.stringify(
  input.previousSteps.map((step) => ({
    name: step.name,
    analysis: step.analysis,
    chosenTool: step.chosenTool,
    toolInput: step.toolInput,
  })),
  null,
  2
)}
\`\`\`

You always respond the full step implementation in a valid json string
\`\`\`json
{
  "name": ...
}
\`\`\``,
    },
    {
      role: "user",
      content: `Step description: ${input.stepDescription}`,
    },
  ];

  const response = await context.getChat(probeMessages, { max_tokens: 500, temperature: 0.25, stop: "Output:", ...promptConfig });

  const responseText = response.choices[0].message.content ?? "null";

  // extract json string from markdown fence
  try {
    const maybeStep = JSON.parse(responseText) as null | Step;
    let parsedParams = typeof maybeStep?.toolInput === "string" ? JSON.parse(maybeStep.toolInput) : maybeStep?.toolInput;
    return { ...maybeStep, toolInput: parsedParams } as Step;
  } catch (e) {
    console.error("Step parsing error", e);
    return null;
  }
}
