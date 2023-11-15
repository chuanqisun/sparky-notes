import { getMethodInputName } from "../hits/method-input";
import { ChatMessage } from "../openai/chat";
import { stickyColors } from "../utils/colors";
import { createOrUseSourceNodes, createTargetNodes, moveStickiesToSectionNewLine, moveStickiesToSectionNoWrap, setFillColor } from "../utils/edit";
import { Description, FormTitle, TextField, getFieldByLabel, getTextByContent } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToType, getInnerStickies } from "../utils/query";
import { sortLeftToRight } from "../utils/sort";
import { combineWhitespace, shortenToWordCount } from "../utils/text";
import { CreationContext, Program, ProgramContext, ReflectionContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class ThemeProgram implements Program {
  public name = "theme";

  public getSummary(node: FrameNode) {
    return `Theme: ${getFieldByLabel("Theme count", node)!.value.characters} or more themes across ${
      getFieldByLabel("Item type", node)!.value.characters
    } stickies`;
  }

  public getMethodology(_context: ReflectionContext, node: FrameNode) {
    return `Identify themes across the "${getFieldByLabel("Item type", node)!.value.characters}" items in the ${getMethodInputName(node)}`;
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

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          `User will provide a ${itemType} list. You must identify ${themeCount} or more themes across the ${itemType} list. Associate the relevant ${itemType} id numbers after each theme. Respond use this format:
        
Theme: <description of the first theme>
${itemType} #s: <the #s of the ${itemType}, e.g. 2,7,11>
Theme: <description of the second theme>
${itemType} #s: <the #s of the ${itemType}, e.g. 9,1,8>
        `.trim(),
      },
      {
        role: "user",
        content: inputNodes
          .map(
            (node, index) =>
              `${itemType} #${index + 1}: ${combineWhitespace(node.text.characters)} ${shortenToWordCount(
                2000 / inputNodes.length,
                node.getPluginData("shortContext")
              )}`
          )
          .join("\n"),
      },
    ];

    const response = (await context.chat(messages, { max_tokens: 250 })).choices[0].message.content?.trim() ?? "";

    if (context.isAborted() || context.isChanged()) return;

    const themes = response
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
      const reflectionMessages: ChatMessage[] = [
        { role: "system", content: `Summarize the ${itemType} items, focus on their common theme "${theme.name}". Respond with a single paragraph.` },
        {
          role: "user",
          content: theme.items
            .map(
              (item, index) =>
                `${itemType} item ${index + 1}: ${combineWhitespace(item.text.characters)} ${shortenToWordCount(
                  2000 / inputNodes.length,
                  item.getPluginData("shortContext")
                )}`
            )
            .join("\n"),
        },
      ];

      replaceNotification(`Reflecting on theme "${theme.name}"...`, { timeout: 20000 });
      const themeIntroResponse = (await context.chat(reflectionMessages, { max_tokens: 300 })).choices[0].message.content?.trim() ?? "";
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
