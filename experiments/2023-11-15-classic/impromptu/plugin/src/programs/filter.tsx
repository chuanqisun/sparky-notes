import { getMethodInputName } from "../hits/method-input";
import { ChatMessage } from "../openai/chat";
import { cloneSticky, createOrUseSourceNodes, createTargetNodes, moveStickiesToSection } from "../utils/edit";
import { Description, FormTitle, TextField, getFieldByLabel, getTextByContent } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToType, getInnerStickies } from "../utils/query";
import { combineWhitespace } from "../utils/text";
import { CreationContext, Program, ProgramContext, ReflectionContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class FilterProgram implements Program {
  public name = "filter";

  public getSummary(node: FrameNode) {
    return `Filter: ${getFieldByLabel("Yes/No question", node)!.value.characters}`;
  }

  public getMethodology(_context: ReflectionContext, node: FrameNode) {
    return `Filter the items in the ${getMethodInputName(node)} with the Yes/No question "${getFieldByLabel("Yes/No question", node)!.value.characters}"`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>Filter</FormTitle>
        <Description>For each sticky, determine where it belongs based on a Yes/No question. Lock an output sticky for use as training example.</Description>
        <TextField label="Yes/No question" value="Does the statement mention a robot?" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Filter", node)!.locked = true;
    getFieldByLabel("Yes/No question", node)!.label.locked = true;

    const sources = createOrUseSourceNodes(["All items"], context.selectedOutputNodes);
    const targets = createTargetNodes(["Yes", "No"]);

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: targets,
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const inputStickies = getInnerStickies(context.sourceNodes);
    const question = getFieldByLabel("Yes/No question", node)!.value.characters;

    for (const currentSticky of inputStickies) {
      const targetNodes = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"));

      if (targetNodes.length < 2) {
        replaceNotification("Filter requires 2 output sections.", { error: true });
        break;
      }

      const positiveContainer =
        targetNodes.find((node) => node.name === "Yes") ??
        (() => {
          targetNodes[0].name = "Yes";
          return targetNodes[0];
        })();
      const negativeContainer =
        targetNodes.find((node) => node.name === "No") ??
        (() => {
          targetNodes[1].name = "No";
          return targetNodes[1];
        })();

      const positiveSamples = getInnerStickies([positiveContainer])
        .slice(0, 7)
        .map((sticky) => combineWhitespace(sticky.text.characters));
      const negativeSamples = getInnerStickies([negativeContainer])
        .slice(0, 7)
        .map((sticky) => combineWhitespace(sticky.text.characters));

      const shuffledExamples = [...positiveSamples.map((sample) => [sample, "Yes"]), ...negativeSamples.map((sample) => [sample, "No"])].sort(
        () => Math.random() - 0.5
      );

      const messages: ChatMessage[] = [
        {
          role: "system",
          content: `Read the text carefully and answer the question based on the text. Respond with "Yes" or "No".`.trim(),
        },
        ...shuffledExamples.flatMap((example) => [
          {
            role: "user" as const,
            content: `Text: ${example[0]}\n\nQuestion: ${question}`,
          },
          {
            role: "assistant" as const,
            content: example[1],
          },
        ]),
        {
          role: "user",
          content: `Text: ${combineWhitespace(currentSticky.text.characters)} ${currentSticky.getPluginData("shortContext")}\n\nQuestion: ${question}`,
        },
      ];

      const binaryAnswer = (await context.chat(messages, { max_tokens: 10 })).choices[0].message.content?.trim() ?? "No";

      if (!figma.getNodeById(currentSticky.id)) continue;
      if (context.isAborted() || context.isChanged()) return;
      const newSticky = cloneSticky(currentSticky);

      const targetNodesAfterCompletion = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"));
      const [positiveContainerAfter, negativeContainerAfter] =
        targetNodesAfterCompletion[0].name === "Yes" ? targetNodesAfterCompletion : targetNodesAfterCompletion.reverse();
      const isPositive = binaryAnswer.toLocaleLowerCase().includes("yes");
      const isNegative = binaryAnswer.toLocaleLowerCase().includes("no");
      if (!isPositive && !isNegative) {
        break;
      }

      moveStickiesToSection([newSticky], isPositive ? positiveContainerAfter : negativeContainerAfter);
    }
  }
}
