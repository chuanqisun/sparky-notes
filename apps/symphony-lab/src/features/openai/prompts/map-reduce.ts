import type { AppContext } from "../../../main";
import type { WorkItem } from "../../notebook/notebook";
import type { ChatMessage } from "../chat";
import { responseToArray } from "../format";

export type Mapper = (context: AppContext, workItems: WorkItem[]) => Promise<WorkItem[]>;

export const goalMapper: Mapper = async (context, workItems) => {
  const bucket = workItems.map((item) => item.displayText).join("\n");
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Infer the high level goal behind the message. Respond with one goal per line, up to three lines. Each line must start with a bullet point "* "`,
    },
    {
      role: "user",
      content: `${bucket}`,
    },
  ];
  const response = await context.getChat(messages, { max_tokens: 200 });
  const resultList = responseToArray(response.choices[0].message.content);
  return resultList.map((item) => ({ id: crypto.randomUUID(), displayText: item }));
};

export const tasksMapper: Mapper = async (context, workItems) => {
  const bucket = workItems.map((item) => item.displayText).join("\n");
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Infer the necessary tasks needed to accomplish the goals in the message. Respond with one task per line. Each line must start with a bullet point "* "`,
    },
    {
      role: "user",
      content: `${bucket}`,
    },
  ];
  const response = await context.getChat(messages, { max_tokens: 200 });
  const resultList = responseToArray(response.choices[0].message.content);
  return resultList.map((item) => ({ id: crypto.randomUUID(), displayText: item }));
};

export const questionMapper: Mapper = async (context, workItems) => {
  const bucket = workItems.map((item) => item.displayText).join("\n");
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Infer questions based on the message. Respond with one question per line. Each line must start with a bullet point "* "`,
    },
    {
      role: "user",
      content: `Text: ${bucket}`,
    },
  ];
  const response = await context.getChat(messages, { max_tokens: 200 });
  const resultList = responseToArray(response.choices[0].message.content);
  return resultList.map((item) => ({ id: crypto.randomUUID(), displayText: item }));
};

export const goalReducer: Mapper = async (context, workItems) => {
  const bucket = workItems.map((item) => item.displayText).join("\n");
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Consolidate the high level goals based on the message. Respond with one goal per line. Three lines max. Each line must start with a bullet point "* "`,
    },
    {
      role: "user",
      content: `${bucket}`,
    },
  ];
  const response = await context.getChat(messages, { max_tokens: 200 });
  const resultList = responseToArray(response.choices[0].message.content);
  return resultList.map((item) => ({ id: crypto.randomUUID(), displayText: item }));
};

// TODO perform the task using ReAct, or keep the task in an "pending" | "not started" state
export const taskReducer: Mapper = async (context, workItems) => {
  const bucket = workItems.map((item) => item.displayText).join("\n");
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Consolidate tasks based on the message. Respond with one task per line. Three lines max. Each line must start with a bullet point "* "`,
    },
    {
      role: "user",
      content: `${bucket}`,
    },
  ];
  const response = await context.getChat(messages, { max_tokens: 200 });
  const resultList = responseToArray(response.choices[0].message.content);
  return resultList.map((item) => ({ id: crypto.randomUUID(), displayText: item }));
};

// TODO expect user answer or keep the question in an "unknown" state
export const questionReducer: Mapper = async (context, workItems) => {
  const bucket = workItems.map((item) => item.displayText).join("\n");
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Consolidate questions based on the message. Respond with one question per line. Three lines max. Each line must start with a bullet point "* "`,
    },
    {
      role: "user",
      content: `Text: ${bucket}`,
    },
  ];
  const response = await context.getChat(messages, { max_tokens: 200 });
  const resultList = responseToArray(response.choices[0].message.content);
  return resultList.map((item) => ({ id: crypto.randomUUID(), displayText: item }));
};
