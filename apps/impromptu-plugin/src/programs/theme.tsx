import { getCompletion } from "../openai/completion";
import { stickyColors } from "../utils/colors";
import { createOrUseSourceNodes, createTargetNodes, moveStickiesToSectionNewLine, moveStickiesToSectionNoWrap, setStickyColor } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { filterToType, getInnerStickies } from "../utils/query";
import { sortLeftToRight } from "../utils/sort";
import { CreationContext, Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class ThemeProgram implements Program {
  public name = "theme";

  public getSummary(node: FrameNode) {
    return `Theme: ${getFieldByLabel("Instruction", node)!.value.characters}`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>Theme</FormTitle>
        <Description>Identify common themes across stickies and group them accordingly.</Description>
        <TextField label="Instruction" value="You are a UX researcher with deep exerience in Usability Engineering and analyzing usability studies." />
        <TextField label="Theme count" value="4" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Theme", node)!.locked = true;
    getFieldByLabel("Instruction", node)!.label.locked = true;
    getFieldByLabel("Theme count", node)!.label.locked = true;

    const sources = createOrUseSourceNodes(["Input"], context.selectedOutputNodes);
    const targets = createTargetNodes(["Output"]);

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: targets,
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const sources = context.sourceNodes.sort(sortLeftToRight);

    if (!sources.length) {
      return;
    }

    const inputNodes = getInnerStickies(sources);

    const prompt = `
You are a UX researcher with deep exerience in Usability Engineering and analyzing usability studies.

Using the following format, we will be identify four or more themes from the following usability issues, and list the relevant issue numbers that relate to the theme.

FORMAT START
Theme: <description of the first theme>
Issues: <the # of the issue, e.g. 2,7,11>
Theme: <description of the second theme>
Issues: <the # of the issue, e.g. 8,1,9>
FORMAT END

The following usability issues were found across a set of usability studies conducted on Microsoft's Azure Portal experience.
${inputNodes.map((node, index) => `Issue #${index + 1}: ${node.text.characters.trim()} ${node.getPluginData("shortContext")}`).join("\n")}

Theme:`;

    const fullAnswer = (await getCompletion(context.completion, prompt, { max_tokens: 800 })).choices[0].text.trim();

    const themes = fullAnswer
      .split("Theme:")
      .map((themeBlock) => themeBlock.trim())
      .filter(Boolean)
      .map((themeBlock) => {
        const allThemeLines = themeBlock
          .split("\n")
          .map((themeLine) => themeLine.trim())
          .filter(Boolean);
        const themeName = allThemeLines[0];
        const themeItems = [...(allThemeLines.find((line) => line.startsWith("Issues"))?.matchAll(/\d+/g) ?? [])]
          .map((position) => parseInt(position[0]) - 1)
          .map((itemIndex) => inputNodes[itemIndex]);

        console.log(themeItems);
        // .filter(Boolean) as StickyNode[];
        return {
          name: themeName,
          items: themeItems,
        };
      });

    console.log(themes);

    if (context.isAborted() || context.isChanged()) return;

    const targetSection = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
    if (!targetSection) return;

    for (const theme of themes) {
      const themeSticky = figma.createSticky();
      themeSticky.text.characters = theme.name;
      setStickyColor(stickyColors.Green, themeSticky);
      moveStickiesToSectionNewLine([themeSticky], targetSection);

      for (const item of theme.items) {
        const itemSticky = figma.createSticky();
        itemSticky.text.characters = item.text.characters;
        setStickyColor(stickyColors.Yellow, itemSticky);
        moveStickiesToSectionNoWrap([itemSticky], targetSection);
      }
    }
  }
}
