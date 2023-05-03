import type React from "react";
import { ForceGraph3D } from "react-force-graph";
import SpriteText from "three-spritetext";
import dataset from "./data/graph-viz-export.json";

const { nodes, links } = dataset as any;

const linkSubset = links.slice(0, 100) as { source: string; target: string }[];
const nodeSubset = linkSubset.flatMap((link) => [{ id: link.source }, { id: link.target }]);

export const ThreeGraph: React.FC = () => {
  return (
    <div>
      <ForceGraph3D graphData={{ nodes: nodeSubset, links: linkSubset }} nodeLabel={"id"} linkLabel={"predicate"} linkThreeObjectExtend={true} />
    </div>
  );
};

export default ThreeGraph;

function renderLink(link: any) {
  // extend link with text sprite
  const sprite = new SpriteText(`${link.predicate}`);
  sprite.color = "lightgrey";
  sprite.textHeight = 16;
  return sprite;
}

function updateLinkPosition(sprite: any, { start, end }: any) {
  const middlePos = {
    x: start["x"] + (end["x"] - start["x"]) / 2,
    y: start["y"] + (end["y"] - start["y"]) / 2,
    z: start["z"] + (end["z"] - start["z"]) / 2,
  };

  // Position sprite
  Object.assign(sprite.position, middlePos);
}
