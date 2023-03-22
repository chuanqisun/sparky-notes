import { RunContext } from "../../main";
import { responseToArray } from "../openai/format";

export async function questionToTaskSteps(context: RunContext, question: string): Promise<string[]> {
  const prompt = `
Make a step-by-step plan to answer the following question. 
Question: "${question}"
Step by step plan (one line per step): `;
  const config = {
    max_tokens: 200,
  };

  const response = await context.getCompletion(prompt, config);

  return responseToArray(response.choices[0].text);
}
