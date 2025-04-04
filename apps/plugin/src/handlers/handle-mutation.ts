import type { MessageToFigma, MessageToWeb } from "@sticky-plus/figma-ipc-types";
import { appendAsTiles, loadFonts, replaceNotification, type LayoutFn, type ProxyToWeb } from "@sticky-plus/figma-tools";
import { getAbsoluteBoundingBox, getNextHorizontalTilePosition, getNextVerticalTilePosition } from "@sticky-plus/figma-tools/lib/query";
import { setFillColor, stickyColors } from "../utils/color";

export async function handleMutation(message: MessageToFigma, proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  if (!message.mutationRequest) return;

  await loadFonts({ family: "Inter", style: "Medium" });
  await loadFonts({ family: "Inter", style: "Bold" });

  const layoutContainer = figma.createSection();

  const isWideWidth = message.mutationRequest.createSections?.some((createSection) => (createSection.createSummary?.split(" ").length ?? 0) > 40) ?? false;

  const getLayoutFn = (flowDirection: "horizontal" | "vertical" = "horizontal", gap = 32) =>
    flowDirection === "horizontal" ? getNextHorizontalTilePosition.bind(null, { gap }) : getNextVerticalTilePosition.bind(null, { gap });

  const createdSections = await Promise.all(
    (message.mutationRequest.createSections ?? []).map(async (createSection) => {
      // create section, then clone or move nodes into the section
      const section = figma.createSection();
      section.name = createSection.name;
      if (createSection.createSummary)
        createSectionSummary(
          getLayoutFn(createSection.flowDirection, createSection.gap),
          section,
          isWideWidth,
          createSection.name,
          createSection.createSummary
        );
      if (createSection.cloneNodes) await cloneNodeToSection(getLayoutFn(createSection.flowDirection, createSection.gap), section, createSection.cloneNodes);
      if (createSection.moveNodes) await moveNodeToSection(getLayoutFn(createSection.flowDirection, createSection.gap), section, createSection.moveNodes);
      if (createSection.cloneAndUpdateNodes)
        await cloneAndUpdateNodeToSection(getLayoutFn(createSection.flowDirection, createSection.gap), section, createSection.cloneAndUpdateNodes);

      return section;
    })
  );

  const updatedSections = (
    await Promise.all(
      (message.mutationRequest.updateSections ?? []).map(async (updateSection) => {
        const section = (await figma.getNodeByIdAsync(updateSection.id)) as SectionNode;
        if (!section) return null;
        if (updateSection.cloneNodes) await cloneNodeToSection(getLayoutFn(updateSection.flowDirection, updateSection.gap), section, updateSection.cloneNodes);
        if (updateSection.moveNodes) await moveNodeToSection(getLayoutFn(updateSection.flowDirection, updateSection.gap), section, updateSection.moveNodes);
        if (updateSection.cloneAndUpdateNodes)
          await cloneAndUpdateNodeToSection(getLayoutFn(updateSection.flowDirection, updateSection.gap), section, updateSection.cloneAndUpdateNodes);

        return section;
      })
    )
  ).filter(isNotNull);

  await Promise.all(
    (message.mutationRequest.removeSections ?? []).map((removeSectionId) => figma.getNodeByIdAsync(removeSectionId).then((node) => node?.remove()))
  );

  let updatedSectionBoundingBox: Rect | undefined;
  if (updatedSections.length) {
    updatedSectionBoundingBox = getAbsoluteBoundingBox(updatedSections);
  }

  appendAsTiles(layoutContainer, [...createdSections, ...updatedSections], getNextVerticalTilePosition.bind(null, { padding: 0, gap: 120 }));

  const affectedNodes = layoutContainer.children;

  if (message.mutationRequest.position?.relativeToNodes) {
    const nodes = (await Promise.all(message.mutationRequest.position.relativeToNodes.ids.map((id) => figma.getNodeByIdAsync(id))))
      .filter(isNotNull)
      .filter((node) => typeof (node as SceneNode).x === "number");
    const box = getAbsoluteBoundingBox(nodes as SceneNode[]);
    layoutContainer.x = box.x + box.width + 32;
    layoutContainer.y = box.y;
  } else if (message.mutationRequest.position?.viewportCenter) {
    layoutContainer.x = figma.viewport.center.x;
    layoutContainer.y = figma.viewport.center.y;
  } else if (updatedSectionBoundingBox) {
    // use the updatedSectionBoundingBox as the position
    layoutContainer.x = updatedSectionBoundingBox.x;
    layoutContainer.y = updatedSectionBoundingBox.y;
  }

  figma.ungroup(layoutContainer);
  figma.currentPage.selection = affectedNodes;

  if (message.mutationRequest.showSuccessMessage) {
    const options: NotificationOptions | undefined = message.mutationRequest.showLocator
      ? {
          button: {
            text: message.mutationRequest.showLocator,
            action: () => {
              figma.viewport.scrollAndZoomIntoView(affectedNodes);
              figma.currentPage.selection = affectedNodes;
            },
          },
          timeout: 30_000,
        }
      : undefined;

    replaceNotification(message.mutationRequest.showSuccessMessage, options);
  }

  proxyToWeb.respond(message, {
    mutationResponse: {
      createdSections: affectedNodes.map((node) => node.id),
    },
  });
}
function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

async function cloneNodeToSection(layoutFn: LayoutFn, section: SectionNode, sourceIds: string[]) {
  const cloneNodeById = async (id: string) => {
    return (figma.getNodeByIdAsync(id) as Promise<SceneNode | null>).then((node) => (node as FrameNode)?.clone());
  };

  const clonedNodes = await Promise.all(sourceIds.map(cloneNodeById)).then((results) => results.filter(Boolean) as SceneNode[]);
  await moveNodeToSection(
    layoutFn,
    section,
    clonedNodes.map((node) => node.id)
  );
}

async function cloneAndUpdateNodeToSection(layoutFn: LayoutFn, section: SectionNode, sources: { id: string; content: string }[]) {
  const cloneNodeById = async (source: { id: string; content: string }) => {
    return (figma.getNodeByIdAsync(source.id) as Promise<SceneNode | null>).then((node) => {
      if (!node) return null;
      const clone = (node as StickyNode).clone();
      if (clone.type === "STICKY") {
        clone.text.fontSize = 16;
        clone.text.fontName = { family: "Inter", style: "Medium" };
        clone.text.characters = source.content;
        clone.isWideWidth = false;
      }
      return clone;
    });
  };

  const clonedNodes = await Promise.all(sources.map(cloneNodeById)).then((results) => results.filter(Boolean) as SceneNode[]);
  await moveNodeToSection(
    layoutFn,
    section,
    clonedNodes.map((node) => node.id)
  );
}

async function moveNodeToSection(layoutFn: LayoutFn, section: SectionNode, sourceIds: string[]) {
  appendAsTiles(
    section,
    await Promise.all(sourceIds.map((id) => figma.getNodeByIdAsync(id))).then((nodes) => nodes.filter(isNotNull) as SceneNode[]),
    layoutFn
  );
}

function createSectionSummary(layoutFn: LayoutFn, section: SectionNode, isWideWidth: boolean, name: string, summary: string) {
  const summarySticky = figma.createSticky();
  summarySticky.text.fontSize = 16;
  summarySticky.text.fontName = { family: "Inter", style: "Medium" };
  summarySticky.text.characters = name + "\n" + summary;
  summarySticky.text.setRangeFontName(0, name.length, { family: "Inter", style: "Bold" });
  setFillColor(stickyColors.LightGray, summarySticky);
  summarySticky.isWideWidth = isWideWidth;

  appendAsTiles(section, [summarySticky], layoutFn);
}
