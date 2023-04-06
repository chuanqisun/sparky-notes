import type { AppContext } from "../../../main";
import type { ChatMessage, OpenAIChatPayload } from "../../openai/chat";
import { responseToList } from "../../openai/format";

export interface AnalyzeGoalInput {
  goal: string;
  context: string;
}

export interface AnalyzeGoalOutput {
  requirements: string[];
}
export async function analyzeGoal(context: AppContext, input: AnalyzeGoalInput, promptConfig?: Partial<OpenAIChatPayload>): Promise<AnalyzeGoalOutput> {
  const goalMappingMessages: ChatMessage[] = [
    {
      role: "system",
      content: `You are helping the user write a well-researched report. The user will provide you with goals. You must map the goal to a list of required outline points that the ideal document must have. Your must respond with one required outline point per line. Each line must start with "* "`,
    },
    {
      role: "user",
      content: `Goals:
${input.goal}

${input.context ? "Context: " : ""}
${input.context}

Required outline points:`.replaceAll(/\n\n\n+/gm, "\n\n"),
    },
  ];

  const response = await context.getChat(goalMappingMessages, { max_tokens: 300, ...promptConfig });
  return {
    requirements: responseToList(response.choices[0].message.content).listItems,
  };
}

export interface ImproveGoalInput {
  goal: string;
  context: string;
  requirements: string;
}

export interface ImproveGoalOutput {
  suggestions: string[];
}

export async function improveGoalContext(context: AppContext, input: ImproveGoalInput, promptConfig?: Partial<OpenAIChatPayload>): Promise<ImproveGoalOutput> {
  const feedbackMessages: ChatMessage[] = [
    {
      role: "system",
      content: `You are helping the user write a well-researched report. Your job is to ask user for more context information that can be used to translate the goal into concrete document. Ask one question per line. Each new context line must start with "* " and end with a question mark "?"`,
    },
    {
      role: "user",
      content: `Goals:
${input.goal}

${input.requirements ? "Required outline points: " : ""}
${input.requirements}

${input.context ? "Existing context: " : ""}
${input.context ? input.context : ""}

Questions for new context: `.replaceAll(/\n\n\n+/gm, "\n\n"),
    },
  ];

  const response = await context.getChat(feedbackMessages, { max_tokens: 300, ...promptConfig });
  const list = responseToList(response.choices[0].message.content);

  return {
    suggestions: list.listItems,
  };
}

export interface SimulateHumanEffortInput {
  goal: string;
  context: string;
}

export interface SimulateHumanEffortOutput {
  newContext: string[];
}

export async function simulateHumanEffort(
  context: AppContext,
  input: SimulateHumanEffortInput,
  promptConfig?: Partial<OpenAIChatPayload>
): Promise<SimulateHumanEffortOutput> {
  const feedbackMessages: ChatMessage[] = [
    {
      role: "system",
      content: `You are going rephrase a list of sentences. When a sentence is a question, replace it with a full declarative sentence that contains the question and a best answer you can think of. When it is already a declarative sentence, leave it unchanged e.g.
Mix of Questions and Declarative sentences:
- What did you have for breakfast?
- Top cities to visit in America?
- The best gift idea is a good book
- Average size of all countries?

Declarative sentences:
- I had bacon and eggs for breakfast
- Top cities to visit in America: New York, San Francisco
- The best gift idea is a good book
- The average size of all countries require additional research`,
    },
    {
      role: "user",
      content: `Goals:
${input.goal}

${input.context ? "Mix of Questions and Declarative sentences: " : ""}
${input.context ? input.context : ""}

Declarative sentences: `.replaceAll(/\n\n\n+/gm, "\n\n"),
    },
  ];

  const response = await context.getChat(feedbackMessages, { max_tokens: 500, ...promptConfig });
  const list = responseToList(response.choices[0].message.content);

  return {
    newContext: list.listItems,
  };
}
