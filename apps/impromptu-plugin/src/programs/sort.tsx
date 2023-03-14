import { getCompletion } from "../openai/completion";
import { asyncQuicksort, Settlement } from "../utils/async-quicksort";
import { insertStickyToSection } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToType, getInnerStickies } from "../utils/query";
import { Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class SortProgram implements Program {
  public name = "sort";

  public getSummary(node: FrameNode) {
    return `Sort: ${getFieldByLabel("Top sticky description", node)!.value.characters}`;
  }

  public async create() {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333">
        <FormTitle>Sort</FormTitle>
        <Description>Stickies will be re-arranged based on what you would like to see on top.</Description>
        <TextField label="Top sticky description" value="most counterintuitive" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Sort", node)!.locked = true;
    getFieldByLabel("Top sticky description", node)!.label.locked = true;

    const source1 = figma.createSection();
    source1.name = "Unsorted items";

    const target1 = figma.createSection();
    target1.name = "Sorted";

    return {
      programNode: node,
      sourceNodes: [source1],
      targetNodes: [target1],
    };
  }

  public async onEdit(node: FrameNode) {}

  public async run(context: ProgramContext, node: FrameNode) {
    const sortGoal = getFieldByLabel("Top sticky description", node)!.value.characters;

    const inputStickies = getInnerStickies(context.sourceNodes);
    if (!inputStickies.length) return;

    const targetNode = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
    targetNode.children.forEach((child) => child.remove());

    const onPivot = (pivot: StickyNode) => {
      console.log("pivot", pivot);
      const latestTargetContainer = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"));
      if (!latestTargetContainer.length) return;
      insertStickyToSection(pivot, undefined, latestTargetContainer[0]);
    };

    const onElement = (e: StickyNode) => {
      replaceNotification(`Evaluating: ${e.text.characters.trim()}`);
    };

    const onSettle = (settlement: Settlement<StickyNode>) => {
      console.log("settle", settlement);
      const latestTargetContainer = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"));
      if (!latestTargetContainer.length) return;
      if (settlement.left) {
        insertStickyToSection(settlement.left, { node: settlement.pivot, position: "R" }, latestTargetContainer[0]);
      } else if (settlement.right) {
        insertStickyToSection(settlement.right, { node: settlement.pivot, position: "L" }, latestTargetContainer[0]);
      }
    };

    const onCompare = async (a: StickyNode, b: StickyNode) => {
      // const contextA = a.getPluginData("shortContext");
      // const contextB = b.getPluginData("shortContext");

      const prompt = `
Choose between A and B

A: ${a.text.characters.trim()}

B: ${b.text.characters.trim()}

Choose the one that better satisfies the requirement: ${sortGoal}
Choice (A/B): `;

      const topChoiceResult = (
        await getCompletion(context.completion, prompt, {
          max_tokens: 3,
        })
      ).choices[0].text.trim();

      return topChoiceResult === "A" ? -1 : 1;
    };

    await asyncQuicksort(inputStickies, onCompare, onElement, onPivot, onSettle, () => context.isAborted());
  }
}
