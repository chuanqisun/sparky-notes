import { getCompletion } from "../openai/completion";
import { responseToArray } from "../openai/format";
import { stickyColors } from "../utils/colors";
import { createTargetNodes, moveStickiesToSection, setFillColor } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToType } from "../utils/query";
import { shortenToWordCount } from "../utils/text";
import { CreationContext, Program, ProgramContext } from "./program";

const { AutoLayout } = figma.widget;

export class WebSearchProgram implements Program {
  public name = "web-search";

  public getSummary(node: FrameNode) {
    const input = getFieldByLabel("Query", node)!;
    return ` Web search: "${input.value.characters}"`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>Web search</FormTitle>
        <Description>Get itemized results from DuckDuckGo</Description>
        <TextField label="Query" value="2023 Small Business trends" />
        <TextField label="Limit" value="10" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Web search", node)!.locked = true;
    getFieldByLabel("Query", node)!.label.locked = true;
    const targets = createTargetNodes(["Search results"]);

    return {
      programNode: node,
      sourceNodes: [],
      targetNodes: targets,
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const targetNode = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
    if (!targetNode) return;

    const query = getFieldByLabel("Query", node)!.value.characters.trim();
    const limit = parseInt(getFieldByLabel("Limit", node)!.value.characters.trim());

    const { pages: items } = await context.webSearch({ q: query });
    if (context.isChanged() || context.isAborted()) return;
    console.log(`[search] ${items.length} urls found`);

    let resultCount = 0;

    for (const item of items) {
      replaceNotification(`Web search: evaluating ${item.url}`);
      const crawledText = (await context.webCrawl({ url: item.url })).text;
      if (context.isChanged() || context.isAborted()) return;

      const binaryCheck = `
Context: ###
${shortenToWordCount(1000, crawledText)}
###

Check if the context contains a list of items for the following query.

Query: ${query}
Does the context contain a list of items for the query (Yes/No)? `;

      const binaryResponse = await getCompletion(context.completion, binaryCheck, {
        max_tokens: 3,
      });
      if (context.isChanged() || context.isAborted()) return;

      if (!binaryResponse.choices[0].text?.toLocaleLowerCase().includes("yes")) {
        continue;
      }

      const prompt = `
Context: ###
${shortenToWordCount(1000, crawledText)}
###

Use the context above, respond to the query with a bullet list of 3 - 5 items.

Query: ${query}
Response (bullet list of 3 - 5 items): -  `;

      const response = await getCompletion(context.completion, prompt, {
        max_tokens: 100,
      }).then((response) => response.choices[0].text);
      if (context.isChanged() || context.isAborted()) return;

      const listItems = responseToArray(response);

      for (let listItem of listItems) {
        const sticky = figma.createSticky();
        setFillColor(stickyColors.Yellow, sticky);
        sticky.text.characters = listItem;
        sticky.text.hyperlink = {
          type: "URL",
          value: item.url,
        };
        sticky.setPluginData("longContext", shortenToWordCount(1500, crawledText));
        sticky.setPluginData("shortContext", shortenToWordCount(255, crawledText));

        resultCount++;
        moveStickiesToSection([sticky], targetNode);

        if (resultCount === limit) return;
      }
    }
  }
}
