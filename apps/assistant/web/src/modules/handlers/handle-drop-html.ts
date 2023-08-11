import type { CardData, MessageToFigma, MessageToWeb, ParsedLink } from "@h20/assistant-types";
import type { ProxyToFigma } from "@h20/figma-tools";
import { EntityName } from "../hits/entity";
import { entityToCard } from "../hits/entity-to-card";

export function handleDropHtml(message: MessageToWeb, proxyToFigma: ProxyToFigma<MessageToFigma, MessageToWeb>) {
  if (!message.dropHtml) return;

  const { items, context } = message.dropHtml;

  items.map((item) => {
    const container = document.createElement("template");
    container.innerHTML = item;

    const links = Array.from(container.content.querySelectorAll("a"))
      .filter((anchor) => {
        // avoid relative links because the host is unknown to the parser
        return anchor.getAttribute("href")?.match(/https?:\/\//i);
      })
      .map((link) => {
        const title = (link.textContent ?? "").trim();
        const url = link.href;

        return { title, url } as ParsedLink;
      });

    links
      .filter((link) => hasTitle(link) && hasHitsHost(link.url) && hasEntityPath(link.url))
      .map((link) => ({
        ...link,
        url: shortenToLeafEntityPath(toLowercase(removeFragment(removeSearchParams(link.url)))),
      }))
      .filter((link, index, self) => self.findIndex((l) => l.url === link.url) === index) // ensure unique
      .map(linkToCard)
      .forEach((card) => proxyToFigma.notify({ addCard: card }));

    // TODO use context to inform drop position
  });
}

function hasHitsHost(url: string) {
  return url.match(/https:\/\/hits\.microsoft\.com/i);
}

// entity path is one of:
// - /study/123123
// - /note/123123
// - /collection/123123
// - /insight/123123
// - /recommendation/123123
function hasEntityPath(url: string) {
  return url.match(/\/(study|note|collection|insight|recommendation)\/\d+/i);
}

function hasTitle(link: ParsedLink) {
  return link.title.length > 0;
}

function shortenToLeafEntityPath(url: string) {
  const leafPath = url.match(/(\/(study|note|collection|insight|recommendation)\/\d+)+/i)![1];

  return `https://hits.microsoft.com${leafPath}`;
}

function removeSearchParams(url: string) {
  return url.replace(/\?.*/, "");
}

function removeFragment(url: string) {
  return url.replace(/#.*/, "");
}

function toLowercase(url: string) {
  return url.toLowerCase();
}

function linkToCard(link: ParsedLink): CardData {
  const [_, entityName, entityId] = link.url.match(/\/(study|note|collection|insight|recommendation)\/(\d+)/i)!;
  const entityType = Object.entries(EntityName).find(([_type, name]) => name.toLocaleLowerCase() === entityName)![0] as any as number;

  return entityToCard(entityId, entityType, link.title);
}
