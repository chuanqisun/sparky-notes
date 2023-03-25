import { getCompletion } from "../openai/completion";
import { stickyColors } from "../utils/colors";
import { createOrUseSourceNodes, createTargetNodes, moveStickiesToSectionNewLine, moveStickiesToSectionNoWrap, setFillColor } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToType, getInnerStickies } from "../utils/query";
import { sortLeftToRight } from "../utils/sort";
import { combineWhitespace, shortenToWordCount } from "../utils/text";
import { CreationContext, Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class ThemeProgram implements Program {
  public name = "theme";

  public getSummary(node: FrameNode) {
    return `Theme: ${getFieldByLabel("Theme count", node)!.value.characters} or more themes across ${
      getFieldByLabel("Item type", node)!.value.characters
    } stickies`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>Theme</FormTitle>
        <Description>Identify common themes across stickies and group them accordingly.</Description>
        <TextField label="Item type" value="Usability issue" />
        <TextField label="Theme count" value="4" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Theme", node)!.locked = true;
    getFieldByLabel("Item type", node)!.label.locked = true;
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

    const itemType = getFieldByLabel("Item type", node)!.value.characters;
    const themeCount = parseInt(getFieldByLabel("Theme count", node)!.value.characters);

    const inputNodes = getInnerStickies(sources);

    const prompt = `
Using the following format, identify ${themeCount} or more themes across the following ${itemType} list
Provide the relevant ${itemType} id numbers after each theme.

${itemType} list:
${inputNodes
  .map(
    (node, index) =>
      `${itemType} #${index + 1}: ${combineWhitespace(node.text.characters)} ${shortenToWordCount(
        2000 / inputNodes.length,
        node.getPluginData("shortContext")
      )}`
  )
  .join("\n")}

FORMAT START
Theme: <description of the first theme>
${itemType} #s: <the #s of the ${itemType}, e.g. 2,7,11>
Theme: <description of the second theme>
${itemType} #s: <the #s of the ${itemType}, e.g. 9,1,8>
FORMAT END

Begin!
Theme:`;

    const fullAnswer = (await getCompletion(context.completion, prompt, { max_tokens: 200 })).choices[0].text.trim();
    if (context.isAborted() || context.isChanged()) return;

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
        const themeItems = [...(allThemeLines.find((line) => line.toLocaleLowerCase().startsWith(itemType.toLocaleLowerCase()))?.matchAll(/\d+/g) ?? [])]
          .map((position) => parseInt(position[0]) - 1)
          .map((itemIndex) => inputNodes[itemIndex]);

        return {
          name: themeName,
          items: themeItems,
        };
      });

    const targetSection = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
    if (!targetSection) return;

    for (const theme of themes) {
      // inject additional context to the theme
      const prompt = `
Summarize the following ${itemType} items, focus on the theme ${theme.name}.

${theme.items
  .map(
    (item, index) =>
      `${itemType} item ${index + 1}: ${combineWhitespace(item.text.characters)} ${shortenToWordCount(
        2000 / inputNodes.length,
        item.getPluginData("shortContext")
      )}`
  )
  .join("\n")}

Summary in one paragraph:`;

      replaceNotification(`Reflecting on theme "${theme.name}"...`);
      const themeIntroResponse = (await getCompletion(context.completion, prompt, { max_tokens: 250 })).choices[0].text.trim();
      if (context.isAborted() || context.isChanged()) return;

      const themeSticky = figma.createSticky();
      themeSticky.text.characters = theme.name;
      themeSticky.setPluginData("shortContext", themeIntroResponse);
      setFillColor(stickyColors.Green, themeSticky);
      moveStickiesToSectionNewLine([themeSticky], targetSection);

      for (const item of theme.items) {
        const itemSticky = item.clone();
        itemSticky.text.characters = item.text.characters;
        setFillColor(stickyColors.Yellow, itemSticky);
        moveStickiesToSectionNoWrap([itemSticky], targetSection);
      }
    }
  }
}
