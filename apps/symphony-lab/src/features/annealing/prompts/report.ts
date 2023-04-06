import type { AppContext } from "../../../main";
import type { ChatMessage, OpenAIChatPayload } from "../../openai/chat";
import { responseToList } from "../../openai/format";

export interface InflateReportInput {
  goal: string;
  context: string;
  requirements: string;
}

export interface InflateReportOutput {
  report: string;
}
export async function inflateReport(context: AppContext, input: InflateReportInput, promptConfig?: Partial<OpenAIChatPayload>): Promise<InflateReportOutput> {
  const goalMappingMessages: ChatMessage[] = [
    {
      role: "system",
      content: `You are helping the user draft a report. Use the information from the context and make sure all required outline points are addressed. Make sure to fill the outline with great details. Respond the full report in plaintext.`,
    },
    {
      role: "user",
      content: `Goals:
${input.goal}

${input.context ? "Context: " : ""}
${input.context}

${input.requirements ? "Required outline points: " : ""}
${input.requirements}

Full report:`.replaceAll(/\n\n\n+/gm, "\n\n"),
    },
  ];

  const response = await context.getChat(goalMappingMessages, { max_tokens: 2500, temperature: 0.95, ...promptConfig });
  return {
    report: response.choices[0].message.content,
  };
}

export interface DeflateReportInput {
  goal: string;
  context: string;
  report: string;
}

export interface DeflateReportOutput {
  report: string;
}
export async function deflateReport(context: AppContext, input: DeflateReportInput, promptConfig?: Partial<OpenAIChatPayload>): Promise<DeflateReportOutput> {
  const goalMappingMessages: ChatMessage[] = [
    {
      role: "system",
      content: `You are helping the user finalize a draft report. 
1. Remove any content that is not based on the known context.
2. Add transitions and balance paragraph weights.
3. Accurately cite or quote information from the context.
4. Consolidate ideas into sections
5. Improve coherence of sentences.

You will always respond the final report in plaintext`,
    },
    {
      role: "user",
      content: `Goals:
${input.goal}

${input.context ? "Context: " : ""}
${input.context}

${input.report ? "Draft report: " : ""}
${input.report}

Final report: `.replaceAll(/\n\n\n+/gm, "\n\n"),
    },
  ];

  const response = await context.getChat(goalMappingMessages, { max_tokens: 3000, temperature: 0.75, ...promptConfig });
  return {
    report: response.choices[0].message.content,
  };
}

export interface AnalyzeReportInput {
  goal: string;
  requirements: string;
  report: string;
}

export interface AnalyzeReportOutput {
  failures: string[];
}

export async function evaluateReport(context: AppContext, input: AnalyzeReportInput, promptConfig?: Partial<OpenAIChatPayload>): Promise<AnalyzeReportOutput> {
  const failureMessages: ChatMessage[] = [
    {
      role: "system",
      content: `You are helping the user write a well-researched report. Your job is to evaluate a draft against its goal and the required outline points. You must find all the the places where the report is insufficient in meeting the goal and requirements. Respond with one evaluation per line. Each line must start with "* "`,
    },
    {
      role: "user",
      content: `Goals:
${input.goal}

${input.requirements ? "Required outline points: " : ""}
${input.requirements}

${input.report ? "Report: " : ""}
${input.report ? input.report : ""}

Evaluations: `.replaceAll(/\n\n\n+/gm, "\n\n"),
    },
  ];

  const response = await context.getChat(failureMessages, { max_tokens: 300, ...promptConfig });
  const list = responseToList(response.choices[0].message.content);

  return {
    failures: list.listItems,
  };
}

export interface improveReportContext {
  goal: string;
  context: string;
  failures: string;
}

export interface ImproveReportOutput {
  questions: string[];
}

export async function improveReportContext(
  context: AppContext,
  input: improveReportContext,
  promptConfig?: Partial<OpenAIChatPayload>
): Promise<ImproveReportOutput> {
  const feedbackMessages: ChatMessage[] = [
    {
      role: "system",
      content: `You are helping the user write a well-researched report. Your job is to ask user for more context information that can be used to address the issues pointed out in the evaluation of the current draft. Ask one question per line. Each new context line must start with "* " and end with a question mark "?"`,
    },
    {
      role: "user",
      content: `Goals:
${input.goal}

${input.failures ? "Draft evaluation" : ""}
${input.failures}

${input.context ? "Existing context: " : ""}
${input.context ? input.context : ""}

Questions for more context information: `.replaceAll(/\n\n\n+/gm, "\n\n"),
    },
  ];

  const response = await context.getChat(feedbackMessages, { max_tokens: 300, ...promptConfig });
  const list = responseToList(response.choices[0].message.content);

  return {
    questions: list.listItems,
  };
}
