import { parse } from "yaml";

export interface ParsedReport {
  title: string;
  markdown: string;
  error?: string;
}

export function parseReport(text: string): ParsedReport | null {
  const segments = text.trim().split("---");
  if (segments.length < 3) {
    return null;
  }

  const frontmatter = segments[1].trim();
  const markdown = segments.slice(2).join("---").trim();

  try {
    const maybeMetadata = parse(frontmatter);
    if (!maybeMetadata.Title) {
      throw new Error(`"Title" field is not defined in the metadata block`);
    }

    return {
      title: maybeMetadata.Title,
      markdown,
    };
  } catch (e) {
    return {
      title: "",
      markdown,
      error: `${(e as Error).name} ${(e as Error).message}`,
    };
  }
}
