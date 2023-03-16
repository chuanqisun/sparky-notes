import { createOrUseSourceNodes, createTargetNodes } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { filterToType, getInnerStickies } from "../utils/query";
import { CreationContext, Program, ProgramContext } from "./program";

const { AutoLayout } = figma.widget;

export class WebBrowseProgram implements Program {
  public name = "web-browse";

  public getSummary(node: FrameNode) {
    const input = getFieldByLabel("Goal", node)!;
    return ` Web browse: "${input.value.characters}"`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333">
        <FormTitle>Web browse</FormTitle>
        <Description>Start from the link in each input sticky, browse the web and gather information based on your goal.</Description>
        <TextField label="Goal" value="Understand best practice in Web3 app design" />
        <TextField label="Max depth" value="3" />
        <TextField label="Max page view" value="100" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Web browse", node)!.locked = true;
    getFieldByLabel("Goal", node)!.label.locked = true;
    getFieldByLabel("Max depth", node)!.label.locked = true;
    getFieldByLabel("Max page view", node)!.label.locked = true;

    const sources = createOrUseSourceNodes(["Input"], context.selectedOutputNodes);
    const targets = createTargetNodes(["Output"]);

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: targets,
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const targetNode = getNextNodes(node).filter(filterToType("SECTION"))[0];
    if (!targetNode) return;

    const goal = getFieldByLabel("Goal", node)!.value.characters.trim();
    const maxDepth = parseInt(getFieldByLabel("Max depth", node)!.value.characters.trim());
    const maxViewCount = parseInt(getFieldByLabel("Max page view", node)!.value.characters.trim());

    const inputStickies = getInnerStickies(context.sourceNodes);
    if (!inputStickies.length) return;

    const linkUrls = inputStickies
      .filter((sticky) => (sticky.text.hyperlink as HyperlinkTarget)?.value)
      .map((sticky) => ({
        url: (sticky.text.hyperlink as HyperlinkTarget).value,
        title: sticky.text.characters.trim(),
        isUserProvided: true,
      }));

    console.log(linkUrls);
    const queue: { url: string; title: string; isUserProvided: boolean }[] = linkUrls;

    while (queue.length) {
      let link = queue.find((item) => item.isUserProvided);
      if (link) {
        queue.splice(queue.indexOf(link), 1);
      } else {
        link = queue.pop()!; // TODO find the most promising link with GPT
      }

      const crawledText = (await context.webCrawl({ url: link.url })).text;

      // 1. See if the text answer the question, if so, extract answer, generate deep link, and output stick
      console.log(crawledText);

      // 2. Put all links and titles into the queue for next round
    }
  }
}
