import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import { resolve } from "path";
import type {
  FigmaDocumentDefinition,
  IFigmaArticleDefinition,
  IFigmaFrameDefinition,
  IFigmaFrameHeaderDefinition,
  IFigmaFrameImageDefinition,
  IFigmaPivotDefinition,
  IFigmaSectionDefinition,
} from "./portal.types";

export async function parseCoherence(controlsDir: string) {
  const controlDirs = await readdir(controlsDir);
  await Promise.all(
    controlDirs.map(async (controlDir) => {
      const configFile = JSON.parse(await readFile(`${controlsDir}/${controlDir}/Config.json`, "utf-8"));
      const contentFile: FigmaDocumentDefinition = JSON.parse(await readFile(`${controlsDir}/${controlDir}/Content.json`, "utf-8"));

      if (!configFile.componentName) {
        throw new Error(`No component name found for ${controlDir}`);
      }

      const usagePivot = renderDocument(configFile.componentName, contentFile.article);
      if (!usagePivot) {
        console.log(`No usage pivot found for ${configFile.componentName}`);
      } else {
        await mkdir(resolve(controlsDir, `../parsed/`), { recursive: true });
        await writeFile(resolve(controlsDir, `../parsed/${configFile.componentName.replace("/", "_").replace("\\", "_")}.md`), usagePivot);
      }
    })
  );
}

function renderDocument(title: string, article: IFigmaArticleDefinition) {
  return [`# ${title}`, ...(article.pivots ?? []).map(renderPivot)].filter(isTruty).join("\n\n");
}

function renderPivot(pivot: IFigmaPivotDefinition) {
  return [`## ${pivot.title ?? "Untitled"}`, ...(pivot.sections ?? []).map(renderPivotSection)].filter(isTruty).join("\n\n");
}

function renderPivotSection(section: IFigmaSectionDefinition) {
  return [`### ${section.title ?? "Untitled"}`, ...(section.frames ?? []).map(renderPivotSectionFrame)].filter(isTruty).join("\n\n");
}

function renderPivotSectionFrame(frame: IFigmaFrameDefinition) {
  return [
    ...[frame.header].filter(isTruty).map(renderPivotSectionFrameHeader),
    ...(frame.imageDefinition ?? []).filter(isTruty).map(renderPivotSectionFrameImage),
  ]
    .filter(Boolean)
    .join("\n\n");
}
function renderPivotSectionFrameHeader(header: IFigmaFrameHeaderDefinition) {
  return [`#### ${header.text ?? "Untitled"}`, normalizeText(header.body)].filter(isTruty).join("\n\n");
}

function renderPivotSectionFrameImage(image: IFigmaFrameImageDefinition) {
  return [image.state, image.altText ? `(Image: ${image.altText.trim()})` : "", normalizeText(image.supportingText)].filter(isTruty).join("\n\n");
}

function isTruty<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null && value !== "";
}

function normalizeText(text?: string) {
  return text?.trim().replaceAll("º", "- ").replaceAll("•", "- ") ?? "";
}
