import type { ParsedCuration } from "./parse-curation";

export function renderMarkdown(pattern: string, curation: ParsedCuration): string {
  const formattedPage = `
# ${pattern}
     
## Research insights
${curation.groups
  .map((group) =>
    `
### ${group.name}

${group.intro}

${group.items.map((item) => `- ${item.text} ${item.sources.map((source) => `[${source.pos}]`).join("")}`).join("\n")}
`.trim()
  )
  .join("\n")}

## References
${curation.footnotes.map((item) => `${item.pos}. [${item.title}](${item.url}) *${item.rootTitle}*`).join("\n")}
`.trim();

  return formattedPage;
}
