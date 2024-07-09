import type { MessageToFigma } from "@h20/assistant-types";

export async function handleRenderAutoLayoutItem(message: MessageToFigma) {
  if (!message.renderAutoLayoutItem) return;

  await figma.currentPage.loadAsync();
  const container = await figma.currentPage.findOne((n) => n.name === message.renderAutoLayoutItem!.containerName);

  if (!container) {
    figma.notify(`Container with name "${message.renderAutoLayoutItem?.containerName}" not found`, { error: true });
    return;
  }

  if (container.type !== "FRAME" && container.type !== "COMPONENT") {
    figma.notify(`Container with name "${message.renderAutoLayoutItem?.containerName}" is not a frame or component`, { error: true });
    return;
  }

  if (message.renderAutoLayoutItem.clear) {
    (container as ComponentNode | FrameNode).children?.forEach((child) => {
      child.remove();
    });
  }

  const template = message.renderAutoLayoutItem.templateName
    ? await figma.currentPage.findOne((n) => n.name === message.renderAutoLayoutItem!.templateName)
    : null;

  if (message.renderAutoLayoutItem.templateName && !template) {
    figma.notify(`Template with name "${message.renderAutoLayoutItem?.templateName}" not found`, { error: true });
    return;
  }

  if (template && template.type !== "FRAME" && template.type !== "COMPONENT") {
    figma.notify(`Template with name "${message.renderAutoLayoutItem?.templateName}" is not a frame or component`, { error: true });
    return;
  }

  const instance = template?.type === "COMPONENT" ? template.createInstance() : template?.type === "FRAME" ? template.clone() : null;
  if (!instance) return;

  instance.name = instance.name.replace("template", "instance");

  if (message.renderAutoLayoutItem.replacements) {
    const allTextNodes = instance.findAllWithCriteria({ types: ["TEXT"] });
    const loadFont = allTextNodes[0].fontName as FontName;
    if (loadFont) {
      await figma.loadFontAsync(loadFont);
    }

    allTextNodes.forEach((textNode) => {
      Object.entries(message.renderAutoLayoutItem!.replacements!).forEach(([key, value]) => {
        textNode.characters = textNode.characters.replace(`{{${key}}}`, value);
      });
    });
  }

  container.appendChild(instance);
}
