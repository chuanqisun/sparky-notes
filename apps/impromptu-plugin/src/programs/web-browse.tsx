import { getMethodInputName } from "../hits/method-input";
import { getCompletion, OpenAICompletionResponse } from "../openai/completion";
import { createOrUseSourceNodes, createTargetNodes, printStickyNoWrap } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToType, getInnerStickies } from "../utils/query";
import { shortenToWordCount } from "../utils/text";
import { CreationContext, Program, ProgramContext, ReflectionContext } from "./program";

const { AutoLayout } = figma.widget;

interface QueueItem {
  url: string;
  title: string;
  depth: number;
}

export class WebBrowseProgram implements Program {
  public name = "web-browse";

  public getSummary(node: FrameNode) {
    const input = getFieldByLabel("Question", node)!;
    return ` Web browse: "${input.value.characters}"`;
  }

  public getMethodology(_context: ReflectionContext, node: FrameNode) {
    return `Start with links from the ${getMethodInputName(node)}, find information on the web to answer "${
      getFieldByLabel("Question", node)!.value.characters
    }"`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>Web browse</FormTitle>
        <Description>Use linked stickies as starting point, browse the web to collect answers to your question.</Description>
        <TextField label="Question" value="What should a small business owner do in 2023?" />
        <TextField label="Limit" value="20" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Web browse", node)!.locked = true;
    getFieldByLabel("Question", node)!.label.locked = true;
    getFieldByLabel("Limit", node)!.label.locked = true;

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

    const question = getFieldByLabel("Question", node)!.value.characters.trim();
    const limit = parseInt(getFieldByLabel("Limit", node)!.value.characters.trim());
    let currentResultCount = 0;

    const inputStickies = getInnerStickies(context.sourceNodes);
    if (!inputStickies.length) return;

    const linkUrls = inputStickies
      .filter((sticky) => (sticky.text.hyperlink as HyperlinkTarget)?.value)
      .filter(
        (item, index, array) =>
          index === array.findIndex((maybeDuplicate) => (maybeDuplicate.text.hyperlink as any)?.value === (item.text.hyperlink as any)?.value)
      ) // unique
      .map((sticky) => ({
        url: (sticky.text.hyperlink as HyperlinkTarget).value,
        title: sticky.text.characters.trim(),
        isUserProvided: true,
        depth: 0,
      }));

    console.log(linkUrls);
    let queue: QueueItem[] = this.deduplicateQueue(linkUrls);
    let visitedUrls: string[] = [];

    while (queue.length && currentResultCount < limit) {
      const link = await this.getNextItemToCrawl(context, queue, question);
      if (context.isAborted() || context.isChanged()) return;
      if (!link) return;
      queue.splice(queue.indexOf(link), 1);

      visitedUrls.push(link.url);
      replaceNotification(`Web browse: ${link.url}`, { timeout: Infinity });
      console.log(`[crawl progress] ${link.url} at depth ${link.depth}, queue size ${queue.length}`);
      const { text, links } = await context.webCrawl({ url: link.url });

      if (!text) continue;

      if (context.isAborted() || context.isChanged()) return;

      // 1. See if the text answer the question, if so, extract answer, generate deep link, and output stick

      const extractionPrompt = `
Read the following web page carefully and answer the question.

web page """ 
${shortenToWordCount(1200, text)}
"""

Question: ${question}
Answer: `;

      let extractionResponse: OpenAICompletionResponse;
      try {
        extractionResponse = await getCompletion(context.completion, extractionPrompt, { max_tokens: 255 });
      } catch (e) {
        continue;
      }
      if (context.isAborted() || context.isChanged()) return;
      const responseText = extractionResponse.choices[0].text.trim();
      const binaryPrompt = `
Read the following text carefully and answer the question. 

text """ 
${responseText}
"""
Now answer the following question with just "Yes" or "No".


Question: Does the question answer the question "${question}"?
Answer (Yes/No): `.trimStart();

      const binaryAnswer = await getCompletion(context.completion, binaryPrompt, { max_tokens: 3 });
      if (context.isAborted() || context.isChanged()) return;

      if (binaryAnswer.choices[0].text.toLocaleLowerCase().includes("yes")) {
        printStickyNoWrap(node, `${responseText}\n\nSource: ${link.url}`, { href: link.url });
        currentResultCount++;
      }

      queue.push(
        ...links
          .filter((webLink) => webLink.href.length < 255 && !visitedUrls.includes(webLink.href))
          .map((webLink) => ({
            // avoid long URLs to reduce token waste
            title: webLink.title,
            url: webLink.href,
            depth: link!.depth + 1,
          }))
      );
      queue = this.deduplicateQueue(queue);
    }
  }

  private async getNextItemToCrawl(context: ProgramContext, queue: QueueItem[], question: string): Promise<QueueItem | null> {
    // pick zero depth item first
    const zeroDepthItem = queue.find((item) => item.depth === 0);
    if (zeroDepthItem) return zeroDepthItem;

    // pick with GTP
    const prompt = `Pick the best article from the following list to answer the question.
Your answer must be a valid URL string, e.g. https://example.com

List of articles
${queue
  .slice(-40)
  .filter((item) => item.url.startsWith("http"))
  .map((item) => `Title: ${item.title}\nURL: ${item.url}`)
  .join("\n\n")}

Question
${question}

The picked URL is: http`;

    const urlResponse = (
      await getCompletion(context.completion, prompt, {
        max_tokens: 60,
      })
    ).choices[0].text;

    const foundItem = queue.find((item) => item.url.includes(urlResponse.trim()));
    if (foundItem) return foundItem;

    // pick the top of the list
    return queue[0] ?? null;
  }

  private deduplicateQueue(queue: QueueItem[]) {
    return queue.filter((item, index, array) => index === array.findIndex((maybeDupe) => maybeDupe.title === item.title && maybeDupe.url === item.url));
  }
}
