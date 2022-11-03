import type { MessageToMain } from "@h20/types";
import "./card.css";
import { EntityIcon, EntityName } from "./entity";
import type { HitsGraphNode } from "./hits";

export interface HitsCardProps {
  node: HitsGraphNode;
  isParent?: boolean;
  getHighlightHtml: (text: string) => string;
  sendToFigma: (figmaCard: MessageToMain) => void;
}
export function HitsCard({ node, getHighlightHtml, sendToFigma, isParent }: HitsCardProps) {
  return (
    <>
      <li class={`c-list-item`} key={node.id}>
        <button
          class={`u-reset c-button--hits ${isParent ? "c-button--hits-parent" : "c-button--hits-child"}`}
          onClick={() =>
            sendToFigma({
              addCard: {
                title: node.title,
                entityType: node.entityType,
                url: `https://hits.microsoft.com/${EntityName[node.entityType]}/${node.id}`,
              },
            })
          }
        >
          <article class="hits-item">
            <img class="hits-item__icon" src={EntityIcon[node.entityType]} />
            <div class="hits-item__text">
              <span
                class={`hits-item__title ${isParent ? "hits-item__title--parent" : ""}`}
                dangerouslySetInnerHTML={{ __html: getHighlightHtml(node.title) }}
              />{" "}
              {isParent && (
                <>
                  {node.researchers && (
                    <span
                      class="hits-item__meta-field"
                      dangerouslySetInnerHTML={{ __html: getHighlightHtml(node.researchers.map((person) => person.displayName).join(", ")) }}
                    />
                  )}
                  &nbsp;· <span class="hits-item__meta-field" dangerouslySetInnerHTML={{ __html: getHighlightHtml(node.updatedOn.toLocaleDateString()) }} />
                </>
              )}
            </div>
          </article>
        </button>
      </li>
      {node?.children?.map((childNode) => (
        <HitsCard isParent={false} node={childNode as HitsGraphNode} sendToFigma={sendToFigma} getHighlightHtml={getHighlightHtml} />
      ))}
    </>
  );
}
