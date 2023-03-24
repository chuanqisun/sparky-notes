import { getClosestColor } from "../utils/colors";
import { createOrUseSourceNodes, createTargetNodes } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { filterToType, getInnerStickies } from "../utils/query";
import { CreationContext, Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export interface InMemorySticky {
  vId: string;
  text: string;
}

export class ReportProgram implements Program {
  public name = "report";

  public getSummary(node: FrameNode) {
    return `Report: ${getFieldByLabel("Title", node)!.value.characters}`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>Report</FormTitle>
        <Description>
          Draft a HITS report using the stickies, with green stickies as sections, yellow stickies as insights/recommendations, and gray stickies as paragraphs.
        </Description>
        <TextField label="Title" value="My UX Research Report" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Report", node)!.locked = true;
    getFieldByLabel("Title", node)!.label.locked = true;

    const sources = createOrUseSourceNodes(["Input"], context.selectedOutputNodes);
    const targets = createTargetNodes(["Draft preview"]);

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: targets,
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const inputStickies = getInnerStickies(context.sourceNodes);
    if (!inputStickies.length) return;

    const targetNode = getNextNodes(node).filter(filterToType("SECTION"))[0];
    if (!targetNode) return;

    // sort stickies by y, then by x
    const sortedStickies = inputStickies.sort((a, b) => {
      if (a.y === b.y) return a.x - b.x;
      return a.y - b.y;
    });

    const colorStickies = sortedStickies.map((sticky) => {
      const fill = ((sticky.fills as Paint[])?.[0] as SolidPaint)?.color;
      const colorName = fill?.b ? getClosestColor(fill, "LightGray") : "LightGray";
      {
        return {
          text: sticky.text.characters,
          color: colorName,
        };
      }
    });

    const reportText = `
${colorStickies
  .map((sticky) => {
    switch (sticky.color) {
      case "Green":
        return `# ${sticky.text}`;
      case "Yellow":
        return `**Insight** ${sticky.text}`;
      case "LightGray":
        return `${sticky.text}`;
      default:
        return "";
    }
  })
  .join("\n\n")}`.trim();

    const text = figma.createText();
    text.characters = reportText;
    (targetNode as SectionNode).appendChild(text);
    text.x += 16;
    text.y += 16;
    (targetNode as SectionNode).resizeWithoutConstraints(text.width + 32, text.height + 32);
  }
}
