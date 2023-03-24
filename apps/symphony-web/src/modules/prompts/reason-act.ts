import { RunContext } from "../../main";
import { OpenAICompletionPayload } from "../openai/completion";

export interface GenerateReasonActInput {
  pretext: string;
  nextStepName: string;
}
export async function generateReasonAct(context: RunContext, input: GenerateReasonActInput, promptConfig?: Partial<OpenAICompletionPayload>) {
  const prompt = `
Answer the following questions as best you can.

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)

Begin!
${input.pretext}
${input.nextStepName}: `.trimStart();

  const response = await context.getCompletion(prompt, { max_tokens: 300, ...promptConfig });

  const raw = response.choices[0].text.trim();
  const lines = raw.split("\n").filter(Boolean);
  const trimStartIndex = lines.findIndex((line) => line.match(/^.+:/));
  const keepLines = lines.slice(0, trimStartIndex > -1 ? trimStartIndex : undefined);

  const result = keepLines.join("\n").trim();
  return result;
}
