import { EntityType } from "../hits/entity";
import { getInsightQuery, getRecommendationQuery } from "../hits/search";
import { getCompletion, OpenAICompletionPayload } from "../openai/completion";
import { stickyColors } from "../utils/colors";
import { createOrUseSourceNodes, createTargetNodes, moveStickiesToSection, printStickyNewLine, printStickyNoWrap } from "../utils/edit";
import { ensureStickyFont } from "../utils/font";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToType, getInnerStickies } from "../utils/query";
import { sortLeftToRight } from "../utils/sort";
import { shortenToWordCount } from "../utils/text";
import { CreationContext, Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

const MIN_ITER = 5;
const MAX_ITER = 25;
const FINAL_ANSWER_LENGTH = 1000;
const INTERMEDIATE_ANSWER_LENGTH = 400;
const MEM_WINDOW = 2000;

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
          value="I’m new to the Azure Network Manager product. Summarize existing research and help me come up with suggestions to the product design team."
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

    while (iteration < MAX_ITER && !isCompleted) {
      const prompt = getAgentPrompt({ question, memory, tools });
      let response = (await getCompletion(context.completion, ...prompt)).choices[0].text;

      if (context.isAborted() || context.isChanged()) return;

      const finalAnswer = response.split("\n").find((line) => line.startsWith("Final Answer:"));
      if (finalAnswer && iteration < MIN_ITER) {
        // premature conclusion. Nudge to more research
        const nudgePrompt = prompt[0] + "\nThought: I need more information";
        response =
          "\nThought: I need more information" +
          (
            await getCompletion(context.completion, nudgePrompt, {
              max_tokens: INTERMEDIATE_ANSWER_LENGTH,
              stop: ["Observation", "Thought", "Final Answer"],
            })
          ).choices[0].text;

        if (context.isAborted() || context.isChanged()) return;
      } else if (finalAnswer) {
        printStickyNewLine(node, "Thought: I now know the final answer", { color: stickyColors.Yellow, wordPerSticky: 50 });
        // continue for a bit longer
        let token = FINAL_ANSWER_LENGTH;
        while (!isCompleted && token > INTERMEDIATE_ANSWER_LENGTH) {
          try {
            const extendedPrompt = prompt[0] + "\nThought: I now know the final answer\nFinal Answer: ";
            const extendedResponse = (
              await getCompletion(context.completion, extendedPrompt, {
                max_tokens: token,
              })
            ).choices[0].text;

            if (context.isAborted() || context.isChanged()) return;
            isCompleted = true;
            printStickyNoWrap(node, "Final Answer: " + extendedResponse.trim(), { color: stickyColors.Green, wordPerSticky: 50 });
          } catch (e) {
            token -= 100;
          }
        }
        if (!isCompleted) {
          // print the original answer
          printStickyNoWrap(node, finalAnswer.trim(), { color: stickyColors.Green, wordPerSticky: 50 });
        }
        break;
      }

      response
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
          if (line.startsWith("Thought:")) {
            printStickyNewLine(node, line, { color: stickyColors.Yellow, wordPerSticky: 50 });
          } else {
            printStickyNoWrap(node, line, { color: stickyColors.LightGray, wordPerSticky: 50 });
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
      printStickyNoWrap(node, observationText.trim(), { color: stickyColors.LightGray, wordPerSticky: 50 });
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

export async function act(input: { action: string; actionInput: string; programContext: ProgramContext; pretext: string }) {
  if (input.action.toLocaleLowerCase().includes("web search")) {
    try {
      const query = input.actionInput.replace("Action Input:", "").trim();
      const normalizedQuery = query.startsWith(`"`) && query.endsWith(`"`) ? query.slice(1, -1) : query;
      const searchResults = await input.programContext.webSearch({ q: normalizedQuery });
      const observation = searchResults.pages
        .slice(0, 4)
        .map((page, index) => `Result ${index + 1}: ${page.title} ${page.snippet}`)
        .join(" ");
      return observation;
    } catch (e) {
      return "No results found.";
    }
  } else if (input.action.includes("Read web page")) {
    const url = input.actionInput.slice(input.actionInput.indexOf("http"));
    try {
      const crawlResults = await input.programContext.webCrawl({ url });
      return shortenToWordCount(200, crawlResults.markdown); // TODO use GPT summarize
    } catch (e) {
      return "The URL is broken.";
    }
  } else if (input.action.toLocaleLowerCase().includes("research insights")) {
    const query = input.actionInput.replace("Action Input:", "").trim();
    const normalizedQuery = query.startsWith(`"`) && query.endsWith(`"`) ? query.slice(1, -1) : query;
    try {
      const searchSummary = await input.programContext.hitsSearch(getInsightQuery({ query: normalizedQuery, top: 3 }));
      if (!searchSummary.results.length) {
        return "No results found.";
      }

      const observation =
        searchSummary.results
          .flatMap((result, reportIndex) =>
            result.document.children
              .slice(0, 5)
              .filter((child) => child.title?.trim())
              .filter((child) => child.entityType === EntityType.Insight)
              .map((child, claimIndex) => `${reportIndex + 1}.${claimIndex + 1} ${shortenToWordCount(50, child.title!)}`)
          )
          .join(" ") + "...";
      return observation;
    } catch (e) {
      return "No results found.";
    }
  } else if (input.action.toLocaleLowerCase().includes("research recommendations")) {
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
              .filter((child) => child.entityType === EntityType.Recommendation)
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
        max_tokens: INTERMEDIATE_ANSWER_LENGTH,
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
    { name: "Research Insights", description: "Search knowledge base for usability issues. Give this tool 2-5 words as input" },
    { name: "Research Recommendations", description: "Search knowledge base for suggested solutions. Give this tool 2-5 words as input" },
    { name: "Web Search", description: "Search the internet for general ideas" },
    { name: "Deduction", description: "Get specific conclusions from general ideas" },
    { name: "Induction", description: "Get general conclusions from specific observations" },
    { name: "Form Hypothesis", description: "Propose an idea that can be validated" },
    { name: "Examine Assumptions", description: "Speak out what assumptions were made" },
    // { name: "Rephrase Query", description: "Change the query when no results are found" },
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
    if ((wc += nextItemWc) > MEM_WINDOW) break;
    rollingMemory.unshift(nextItem);
  }

  const prompt = `
Use research insights, research recommendations, and critical thinking to answer the following questions as best you can. You have access to the following tools:

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

Question: ${input.question}${rollingMemory.join("")}\n`.trimStart();

  const config: Partial<OpenAICompletionPayload> = {
    max_tokens: INTERMEDIATE_ANSWER_LENGTH,
    stop: ["Observation"],
  };

  return [prompt, config] as const;
}

export function getTextChunks(longText: string, chunkSize: number) {
  const chunks: string[] = [];
  let remainingWords = longText.split(" ");
  while (remainingWords.length) {
    chunks.push(remainingWords.slice(0, chunkSize).join(" "));
    remainingWords = remainingWords.slice(chunkSize);
  }

  return chunks;
}
