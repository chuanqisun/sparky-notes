import { getInsightQuery, getRecommendationQuery } from "../hits/search";
import { getCompletion, OpenAICompletionPayload } from "../openai/completion";
import { stickyColors } from "../utils/colors";
import {
  createOrUseSourceNodes,
  createTargetNodes,
  moveStickiesToSection,
  moveStickiesToSectionNewLine,
  moveStickiesToSectionNoWrap,
  setStickyColor,
} from "../utils/edit";
import { ensureStickyFont } from "../utils/font";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToType, getInnerStickies } from "../utils/query";
import { sortLeftToRight } from "../utils/sort";
import { shortenToWordCount } from "../utils/text";
import { CreationContext, Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class AgentProgram implements Program {
  public name = "agent";

  public getSummary(node: FrameNode) {
    return `Agent: ${getFieldByLabel("Question", node)!.value.characters}`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333">
        <FormTitle>Agent</FormTitle>
        <Description>Answer a question with the provided tools.</Description>
        <TextField
          label="Question"
          value="I am a UX researcher who just joined Microsoft. My team needs generative research to help propose a new product for Office 365. The new product must go viral on social media and appeal to remote workers, especially gen Z. Help me propose a research plan."
        />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Agent", node)!.locked = true;
    getFieldByLabel("Question", node)!.label.locked = true;

    const sources = createOrUseSourceNodes(["Tools"], context.selectedOutputNodes);
    const targets = createTargetNodes(["Output"]);

    // add default tools
    const tools = await getDefaultTools();
    moveStickiesToSection(tools, sources[0]);
    tools.forEach((tool) => (tool.locked = true));

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: targets,
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const sources = context.sourceNodes.sort(sortLeftToRight);

    const tools: AgentTool[] = getInnerStickies([sources[0]]).map((sticky) => {
      const [name, description] = sticky.text.characters.trim().split(": ");
      return { name, description };
    });

    let iteration = 0;
    let isCompleted = false;

    if (sources.length < 1) {
      replaceNotification("Agent requires the Tools section to perform tasks.");
      return;
    }

    const question = getFieldByLabel("Question", node)!.value.characters;

    let memory: string[] = [];

    while (iteration < 25 && !isCompleted) {
      const prompt = getAgentPrompt({ question, memory, tools });
      const response = (await getCompletion(context.completion, ...prompt)).choices[0].text;

      if (context.isAborted() || context.isChanged()) return;

      const finalAnswer = response.split("\n").find((line) => line.startsWith("Final Answer:"));
      if (finalAnswer) {
        printStickyNewLine(node, "Thought: I now know the final answer", stickyColors.Yellow);
        // continue for a bit longer
        let token = 1000;
        while (!isCompleted && token > 400) {
          try {
            const extendedPrompt = prompt[0] + "\nThought: I now know the final answer\nFinal Answer: ";
            const extendedResponse = (
              await getCompletion(context.completion, extendedPrompt, {
                max_tokens: token,
              })
            ).choices[0].text;

            if (context.isAborted() || context.isChanged()) return;
            isCompleted = true;
            printStickyNoWrap(node, "Final Answer: " + extendedResponse.trim(), stickyColors.Green);
          } catch (e) {
            token -= 100;
          }
        }
        if (!isCompleted) {
          // print the original answer
          printStickyNoWrap(node, finalAnswer.trim(), stickyColors.Green);
        }
        break;
      }

      response
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
          if (line.startsWith("Thought:")) {
            printStickyNewLine(node, line, stickyColors.Yellow);
          } else {
            printStickyNoWrap(node, line, stickyColors.LightGray);
          }
        });

      const action = response.split("\n").find((line) => line.startsWith("Action:"));
      const actionInput = response.split("\n").find((line) => line.startsWith("Action Input:"));
      if (!action || !actionInput) {
        memory.push(response + `Observation: I need to try some other tool.`);
        iteration++;
        continue;
      }

      const observation = await act({ action, actionInput, programContext: context, pretext: prompt[0] + response });
      if (context.isAborted() || context.isChanged()) return;
      const observationText = `Observation: ${observation}`;
      memory.push(response + observationText);
      printStickyNoWrap(node, observationText.trim(), stickyColors.LightGray);
      iteration++;
    }
  }
}

export function getFirstOutput(node: FrameNode): SectionNode | null {
  const outputContainer = getNextNodes(node)
    .filter(filterToType<SectionNode>("SECTION"))
    .find((item) => item.name === "Output");
  return outputContainer ?? null;
}
export function printStickyNewLine(node: FrameNode, text: string, color?: RGB): boolean {
  const outputContainer = getFirstOutput(node);
  if (outputContainer) {
    const textChunks = getTextChunks(text, 50);
    textChunks.forEach((chunk, index) => {
      const sticky = figma.createSticky();
      if (color) {
        setStickyColor(color, sticky);
      }
      sticky.text.characters = chunk;
      (index === 0 ? moveStickiesToSectionNewLine : moveStickiesToSectionNoWrap)([sticky], outputContainer);
    });

    return true;
  } else {
    return false;
  }
}
export function printStickyNoWrap(node: FrameNode, text: string, color?: RGB) {
  const outputContainer = getFirstOutput(node);
  if (outputContainer) {
    const textChunks = getTextChunks(text, 50);
    for (const chunk of textChunks) {
      const sticky = figma.createSticky();
      if (color) {
        setStickyColor(color, sticky);
      }
      sticky.text.characters = chunk;
      moveStickiesToSectionNoWrap([sticky], outputContainer);
    }

    return true;
  } else {
    return false;
  }
}

export async function act(input: { action: string; actionInput: string; programContext: ProgramContext; pretext: string }) {
  if (input.action.toLocaleLowerCase().includes("web search")) {
    try {
      const query = input.actionInput.replace("Action Input:", "").trim();
      const normalizedQuery = query.startsWith(`"`) && query.endsWith(`"`) ? query.slice(1, -1) : query;
      const searchResults = await input.programContext.webSearch({ q: normalizedQuery });
      const observation = searchResults.pages
        .slice(0, 3)
        .map((page, index) => `Result ${index + 1}: ${page.title} ${page.snippet}`)
        .join(" ");
      return observation;
    } catch (e) {
      return "The search engine returned error";
    }
  } else if (input.action.includes("Read web page")) {
    const url = input.actionInput.slice(input.actionInput.indexOf("http"));
    try {
      const crawlResults = await input.programContext.webCrawl({ url });
      return shortenToWordCount(200, crawlResults.text.replace(/\s+/g, " ")); // TODO use GPT summarize
    } catch (e) {
      return "The URL is broken";
    }
  } else if (input.action.toLocaleLowerCase().includes("find ux insights")) {
    const query = input.actionInput.replace("Action Input:", "").trim();
    const normalizedQuery = query.startsWith(`"`) && query.endsWith(`"`) ? query.slice(1, -1) : query;
    try {
      const searchSummary = await input.programContext.hitsSearch(getInsightQuery({ query: normalizedQuery, top: 3 }));
      if (!searchSummary.results.length) {
        return "No research found.";
      }

      const observation =
        searchSummary.results
          .flatMap((result, reportIndex) =>
            result.document.children
              .slice(0, 5)
              .filter((child) => child.title?.trim())
              .map((child, claimIndex) => `${reportIndex + 1}.${claimIndex + 1} ${shortenToWordCount(50, child.title!)}`)
          )
          .join(" ") + "...";
      return observation;
    } catch (e) {
      return "No research found.";
    }
  } else if (input.action.toLocaleLowerCase().includes("find ux recommendations")) {
    const query = input.actionInput.replace("Action Input:", "").trim();
    const normalizedQuery = query.startsWith(`"`) && query.endsWith(`"`) ? query.slice(1, -1) : query;
    try {
      const searchSummary = await input.programContext.hitsSearch(getRecommendationQuery({ query: normalizedQuery, top: 3 }));
      if (!searchSummary.results.length) {
        return "No research found.";
      }

      const observation =
        searchSummary.results
          .flatMap((result, reportIndex) =>
            result.document.children
              .slice(0, 5)
              .filter((child) => child.title?.trim())
              .map((child, claimIndex) => `${reportIndex + 1}.${claimIndex + 1} ${shortenToWordCount(50, child.title!)}`)
          )
          .join(" ") + "...";
      return observation;
    } catch (e) {
      return "No research found.";
    }
  } else {
    const observation = (
      await getCompletion(input.programContext.completion, input.pretext + "Observation: ", {
        max_tokens: 400,
        stop: ["Thought", "Action", "Final Answer"],
      })
    ).choices[0].text;
    return observation;
  }
}

export interface AgentTool {
  name: string;
  description: string;
}

export async function getDefaultTools() {
  await ensureStickyFont();

  return [
    { name: "Find UX Insights", description: "Search knowledge base for usability issues. Only use simple keyword query" },
    { name: "Find UX Recommendations", description: "Search knowledge base for suggested solutions. Only use simple keyword query" },
    { name: "Web Search", description: "Search the internet for general ideas" },
    { name: "Deduction", description: "Get specific conclusions from general ideas" },
    { name: "Induction", description: "Get general conclusions from specific observations" },
    { name: "Form Hypothesis", description: "Propose an idea that can be validated" },
    { name: "Examine Assumptions", description: "Speak out what assumptions were made" },
    // { name: "Design Experiment", description: "Design an Experiment that produce evidence" },
    // { name: "Run Experiment", description: "Run an Experiment to gather observations" },
  ].map((tool) => {
    const sticky = figma.createSticky();
    sticky.text.characters = `${tool.name}: ${tool.description}`;
    return sticky;
  });
}

export function getAgentPrompt(input: { question: string; memory: string[]; tools: AgentTool[] }) {
  const rollingMemory: string[] = [];
  let wc = 0;
  const usableMemory = [...input.memory];
  // add memory until limit reached
  while (usableMemory.length) {
    const nextItem = usableMemory.pop()!;
    const nextItemWc = nextItem.split(" ").length;
    if ((wc += nextItemWc) > 2000) break;
    rollingMemory.unshift(nextItem);
  }

  const prompt = `
Answer the following questions as best you can. You have access to the following tools:

${input.tools.map((tool) => `${tool.name}: ${tool.description}`).join("\n\n")}

Ask a specific question.
Use the following format:
Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [${input.tools.map((tool) => tool.name).join(", ")}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question
Explanation: a detailed explanation on the Final Answer
Begin!

Question: ${input.question}${rollingMemory.join(
    ""
  )} I will use critical reasoning, research insights, research recommendations, and web search results.`.trimStart();

  const config: Partial<OpenAICompletionPayload> = {
    max_tokens: 400,
    stop: ["Observation"],
  };

  return [prompt, config] as const;
}

export function getTextChunks(longText: string, chunkSize: 50) {
  const chunks: string[] = [];
  let remainingWords = longText.split(" ");
  while (remainingWords.length) {
    chunks.push(remainingWords.slice(0, chunkSize).join(" "));
    remainingWords = remainingWords.slice(chunkSize);
  }

  return chunks;
}
