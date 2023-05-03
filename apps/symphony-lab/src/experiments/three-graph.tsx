import type React from "react";
import { ForceGraph3D } from "react-force-graph";
import SpriteText from "three-spritetext";
import dataset from "./data/graph-viz-export.json";

const { nodes, predicateEdges, similarityEdges } = dataset as any;

console.log(predicateEdges, similarityEdges);

function randomSampleArray(a: any[], count: number) {
  const shuffled = a.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

const linkSubset = [...randomSampleArray(predicateEdges, 10000), ...randomSampleArray(similarityEdges, 40000)] as { source: string; target: string }[];
// const linkSubset = [...predicateEdges, ...similarityEdges] as { source: string; target: string }[];
const nodeSubset = [...new Set(linkSubset.flatMap((link) => [link.source, link.target]))].map((id) => ({
  id,
}));

export const ThreeGraph: React.FC = () => {
  return (
    <div>
      <ForceGraph3D
        warmupTicks={10}
        cooldownTime={30000}
        enableNodeDrag={false}
        graphData={{ nodes: nodeSubset, links: linkSubset }}
        nodeLabel={"id"}
        linkLabel={"predicate"}
        linkColor={(l) => (l.predicate === "_similar_" ? "lightgrey" : "green")}
        linkThreeObjectExtend={true}
      />
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
