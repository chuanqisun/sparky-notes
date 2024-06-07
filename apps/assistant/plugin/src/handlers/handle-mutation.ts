import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import { appendAsTiles, loadFonts, moveToViewCenter, replaceNotification, type ProxyToWeb } from "@h20/figma-tools";
import { getNextHorizontalTilePosition, getNextVerticalTilePosition } from "@h20/figma-tools/lib/query";
import { setFillColor, stickyColors } from "../utils/color";

export async function handleMutation(message: MessageToFigma, proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  if (!message.mutationRequest) return;

  await loadFonts({ family: "Inter", style: "Medium" });
  await loadFonts({ family: "Inter", style: "Bold" });

  const layoutContainer = figma.createSection();

  const isWideWidth = message.mutationRequest.createSections?.some((createSection) => (createSection.createSummary?.split(" ").length ?? 0) > 40) ?? false;

  const createdSections = (message.mutationRequest.createSections ?? []).map((createSection) => {
    // create section, then clone stickies into the section
    const section = figma.createSection();
    section.name = createSection.name;
    if (createSection.createSummary) createSectionSummary(section, isWideWidth, createSection.name, createSection.createSummary);
    if (createSection.moveStickies) cloneStickiesToSection(section, createSection.moveStickies);

    return section;
  });

  const updatedSections = (
    await Promise.all(
      (message.mutationRequest.updateSections ?? []).map(async (updateSection) => {
        const section = (await figma.getNodeByIdAsync(updateSection.id)) as SectionNode;
        if (!section) return null;
        if (updateSection.moveStickies) cloneStickiesToSection(section, updateSection.moveStickies);
        return section;
      })
    )
  ).filter(isNotNull);

  await Promise.all(
    (message.mutationRequest.removeSections ?? []).map((removeSectionId) => figma.getNodeByIdAsync(removeSectionId).then((node) => node?.remove()))
  );

  appendAsTiles(layoutContainer, [...createdSections, ...updatedSections], getNextVerticalTilePosition.bind(null, { gap: 120 }));

  const affectedNodes = layoutContainer.children;

  moveToViewCenter([layoutContainer]);

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

async function cloneStickiesToSection(section: SectionNode, stickyTexts: string[]) {
  const cloneStickyById = async (id: string) => {
    return (figma.getNodeByIdAsync(id) as Promise<StickyNode | null>).then((node) => node?.clone());
  };

  const existingStickies = await Promise.all(stickyTexts.map(cloneStickyById)).then((results) => results.filter(Boolean) as StickyNode[]);
  appendAsTiles(
    section,
    existingStickies,
    getNextHorizontalTilePosition.bind(null, {
      gap: 32,
    })
  );
}

function createSectionSummary(section: SectionNode, isWideWidth: boolean, name: string, summary: string) {
  const summarySticky = figma.createSticky();
  summarySticky.text.fontSize = 16;
  summarySticky.text.fontName = { family: "Inter", style: "Medium" };
  summarySticky.text.characters = name + "\n" + summary;
  summarySticky.text.setRangeFontName(0, name.length, { family: "Inter", style: "Bold" });
  setFillColor(stickyColors.LightGray, summarySticky);
  summarySticky.isWideWidth = isWideWidth;

  appendAsTiles(
    section,
    [summarySticky],
    getNextHorizontalTilePosition.bind(null, {
      gap: 32,
    })
  );
}
