import { getCompletion } from "../openai/completion";
import { asyncQuicksort, Settlement } from "../utils/async-quicksort";
import { stickyColors } from "../utils/colors";
import { createOrUseSourceNodes, createTargetNodes, insertStickyToSection, setFillColor } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToType, getInnerStickies } from "../utils/query";
import { combineWhitespace } from "../utils/text";
import { CreationContext, Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export interface InMemorySticky {
  vId: string;
  text: string;
}

export class SortProgram implements Program {
  public name = "sort";

  public getSummary(node: FrameNode) {
    return `Sort: ${getFieldByLabel("What to promote", node)!.value.characters}`;
  }

  public getMethodology(_context: ProgramContext, node: FrameNode) {
    return `Sort and identify items that are "${getFieldByLabel("What to promote", node)!.value.characters}"`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>Sort</FormTitle>
        <Description>Promote the best stickies to the left. Sorting will speed up as it progresses.</Description>
        <TextField label="What to promote" value="most counterintuitive" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Sort", node)!.locked = true;
    getFieldByLabel("What to promote", node)!.label.locked = true;

    const sources = createOrUseSourceNodes(["Pre-sorted"], context.selectedOutputNodes);
    const targets = createTargetNodes(["Sorted"]);

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: targets,
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const virtualToRealIdMap = new Map<string, string>();

    const sortGoal = getFieldByLabel("What to promote", node)!.value.characters;

    const inputStickies = getInnerStickies(context.sourceNodes);
    if (!inputStickies.length) return;

    const targetNode = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
    if (!targetNode) return;

    const inMemoryStickies: InMemorySticky[] = inputStickies.map((sticky) => ({
      vId: sticky.id,
      text: `${combineWhitespace(sticky.text.characters)} ${sticky.getPluginData("shortContext")}`.trim(),
    }));

    const onPivot = (pivot: InMemorySticky) => {
      console.log("pivot", pivot);
      const realSticky = figma.createSticky();
      setFillColor(stickyColors.Yellow, realSticky);
      realSticky.text.characters = pivot.text;
      virtualToRealIdMap.set(pivot.vId, realSticky.id);
      const latestTargetContainer = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"));
      if (!latestTargetContainer.length) return;
      insertStickyToSection(realSticky, undefined, latestTargetContainer[0]);
    };

    const onElement = (e: InMemorySticky) => {
      replaceNotification(`Evaluating: ${e.text.trim()}`);
    };

    const onSettle = (settlement: Settlement<InMemorySticky>) => {
      console.log("settle", settlement);
      const latestTargetContainer = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
      if (!latestTargetContainer) return;
      const realSticky = figma.createSticky();
      setFillColor(stickyColors.Yellow, realSticky);
      if (settlement.left) {
        realSticky.text.characters = settlement.left.text;
        virtualToRealIdMap.set(settlement.left.vId, realSticky.id);
        const realPivot = figma.getNodeById(virtualToRealIdMap.get(settlement.pivot.vId)!) as StickyNode;
        if (!realPivot) return;

        insertStickyToSection(realSticky, { node: realPivot, position: "R" }, latestTargetContainer);
      } else if (settlement.right) {
        realSticky.text.characters = settlement.right.text;
        virtualToRealIdMap.set(settlement.right.vId, realSticky.id);
        const realPivot = figma.getNodeById(virtualToRealIdMap.get(settlement.pivot.vId)!) as StickyNode;
        if (!realPivot) return;

        insertStickyToSection(realSticky, { node: realPivot, position: "L" }, latestTargetContainer);
      }
    };

    const onCompare = async (a: InMemorySticky, b: InMemorySticky) => {
      // const contextA = a.getPluginData("shortContext");
      // const contextB = b.getPluginData("shortContext");

      const prompt = `

A: ${a.text.trim()}

B: ${b.text.trim()}

Question: between A and B, which one is ${sortGoal}
Ansower (A/B): `;

      const topChoiceResult = (
        await getCompletion(context.completion, prompt, {
          max_tokens: 3,
        })
      ).choices[0].text.trim();

      return topChoiceResult === "A" ? -1 : 1;
    };

    await asyncQuicksort(inMemoryStickies, onCompare, onElement, onPivot, onSettle, () => context.isAborted() || context.isChanged());
  }
}
