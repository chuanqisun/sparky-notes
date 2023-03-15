import { getInsightQuery } from "../hits/search";
import { getCompletion, OpenAICompletionPayload } from "../openai/completion";
import { createOrUseSourceNodes, createTargetNodes, moveStickiesToSection, moveStickiesToSectionNewLine } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToType } from "../utils/query";
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
        <TextField label="Question" value="What can be improved on WSL?" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Agent", node)!.locked = true;
    getFieldByLabel("Question", node)!.label.locked = true;

    const sources = createOrUseSourceNodes(["Input", "Tools"], context.selectedOutputNodes);
    const targets = createTargetNodes(["Output", "Thoughts"]);

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: targets,
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const sources = context.sourceNodes.sort(sortLeftToRight);

    let iteration = 0;
    let isCompleted = false;

    if (sources.length < 1) {
      replaceNotification("Agent requires both the Input and the Tools section to perform tasks.");
      return;
    }

    const question = getFieldByLabel("Question", node)!.value.characters;

    let memory: string[] = [];

    while (iteration < 10 && !isCompleted) {
      const prompt = getAgentPrompt({ question, memory });
      const response = (await getCompletion(context.completion, ...prompt)).choices[0].text;

      if (context.isAborted() || context.isChanged()) return;

      const finalAnswer = response.split("\n").find((line) => line.startsWith("Final Answer:"));
      if (finalAnswer) {
        isCompleted = true;
        const sticky = figma.createSticky();
        sticky.text.characters = finalAnswer.trim();
        const outputContainer = getNextNodes(node)
          .filter(filterToType<SectionNode>("SECTION"))
          .find((item) => item.name === "Output");
        if (!outputContainer) return;

        moveStickiesToSection([sticky], outputContainer);
        return;
      }

      const thoughts = response.split("\n").filter((line) => line.startsWith("Thought:"));

      thoughts.forEach((thought) => {
        const sticky = figma.createSticky();
        sticky.text.characters = thought.trim();
        const thoughtsContainer = getNextNodes(node)
          .filter(filterToType<SectionNode>("SECTION"))
          .find((item) => item.name === "Thoughts");
        if (!thoughtsContainer) return;
        moveStickiesToSectionNewLine([sticky], thoughtsContainer);
      });

      const action = response.split("\n").find((line) => line.startsWith("Action:"));
      const actionInput = response.split("\n").find((line) => line.startsWith("Action Input:"));
      if (!action || !actionInput) {
        memory.push(response + `Observation: I need to continue.`);
        iteration++;
        continue;
      }

      console.log(`[action]`, [action, actionInput]);
      const observation = await act({ action, actionInput, programContext: context });
      if (context.isAborted() || context.isChanged()) return;
      const dummyObservation = `Observation: ${observation}`;

      memory.push(response + dummyObservation);
      iteration++;
    }
  }
}

export async function act(input: { action: string; actionInput: string; programContext: ProgramContext }) {
  if (input.action.includes("Web search")) {
    try {
      const query = input.actionInput.replace("Action Input:", "").trim();
      const normalizedQuery = query.startsWith(`"`) && query.endsWith(`"`) ? query.slice(1, -1) : query;
      const searchResults = await input.programContext.webSearch({ q: normalizedQuery });
      const observation = searchResults.pages
        .slice(0, 5)
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
  } else if (input.action.includes("UX insights search")) {
    const query = input.actionInput.replace("Action Input:", "").trim();
    const normalizedQuery = query.startsWith(`"`) && query.endsWith(`"`) ? query.slice(1, -1) : query;
    try {
      const searchSummary = await input.programContext.hitsSearch(getInsightQuery({ query: normalizedQuery, top: 5 }));
      if (!searchSummary.results.length) {
        return "No research found.";
      }

      const observation = searchSummary.results
        .flatMap((result, reportIndex) =>
          result.document.children
            .slice(0, 5)
            .filter((child) => child.title?.trim())
            .map((child, claimIndex) => `${reportIndex + 1}.${claimIndex + 1} ${shortenToWordCount(20, child.title!)}`)
        )
        .join(" ");
      return observation;
    } catch (e) {
      return "No research found.";
    }
  } else if (input.action.includes("Synthesize insights")) {
    return "The research insights can be summarized as ";
  } else {
    return "Tool not available";
  }
}

export function getAgentPrompt(input: { question: string; memory: string[] }) {
  const prompt = `
Answer the following questions as best you can. You have access to the following tools:

UX insights search: Find usability problems and solutions on software products

Web search: Find articles on the internet. Give this tool a simple text query

Ask a specific question.
Use the following format:
Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [Web search, Get clarification, Find research insights]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question
Begin!

Question: ${input.question}${input.memory.slice(-2).join("")}`.trimStart();

  const config: Partial<OpenAICompletionPayload> = {
    max_tokens: 3000,
    stop: ["Observation"],
  };

  return [prompt, config] as const;
}
