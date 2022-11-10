import type { MessageToMain } from "@h20/types";
import type { HitsFtsNode } from "../fts/fts";
import "./card.css";
import { EntityBackgroundColor, EntityDisplayName, EntityIcon, EntityName } from "./entity";

export interface HitsCardProps {
  node: HitsFtsNode;
  isParent?: boolean;
  sendToFigma: (figmaCard: MessageToMain) => void;
}
export function HitsCard({ node, sendToFigma, isParent }: HitsCardProps) {
  return (
    <>
      <li class={`c-list__item`} key={node.id}>
        <button
          class={`u-reset c-button--hits ${isParent ? "c-button--hits-parent" : "c-button--hits-child"}`}
          onClick={() =>
            sendToFigma({
              addCard: {
                category: EntityDisplayName[node.entityType],
                title: node.title,
                entityType: node.entityType,
                backgroundColor: EntityBackgroundColor[node.entityType],
                url: `https://hits.microsoft.com/${EntityName[node.entityType]}/${node.id}`,
              },
            })
          }
        >
          <article class="hits-item">
            <img class="hits-item__icon" src={EntityIcon[node.entityType]} />
            <div class="hits-item__text">
              <span class={`hits-item__title ${isParent ? "hits-item__title--parent" : ""}`} dangerouslySetInnerHTML={{ __html: node.titleHtml }} />{" "}
              {isParent && (
                <>
                  {node.researchers && <span class="hits-item__meta-field" dangerouslySetInnerHTML={{ __html: node.researchersHtml }} />}
                  &nbsp;· <span class="hits-item__meta-field">{node.updatedOn.toLocaleDateString()}</span>
                </>
              )}
            </div>
          </article>
        </button>
      </li>
      {isParent &&
        node.children.map((childNode) =>
          childNode.hasHighlight ? <HitsCard isParent={false} node={childNode as any as HitsFtsNode} sendToFigma={sendToFigma} /> : null
        )}
    </>
  );
}
