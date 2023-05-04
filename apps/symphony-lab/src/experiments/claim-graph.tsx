import type React from "react";
import { ForceGraph3D } from "react-force-graph";
import styled from "styled-components";
import SpriteText from "three-spritetext";
import dataset from "./data/graph-viz-export.json";

const { nodes, predicateEdges, similarityEdges, claimToClaimEdge } = dataset as any;

// console.log(predicateEdges, similarityEdges);

function randomSampleArray(a: any[], count: number) {
  const shuffled = a.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// const linkSubset = [...randomSampleArray(predicateEdges, 200), ...randomSampleArray(similarityEdges, 400)] as { source: string; target: string }[];
const linkSubset = [...randomSampleArray(claimToClaimEdge, 80000)] as {
  source: string;
  sourceTitle: string;
  target: string;
  targetTitle: string;
  predicate: string[];
}[];

const displayLinks = linkSubset.map((link) => ({ ...link, label: link.predicate.join(" | ") }));
const nodeSubset = linkSubset
  .flatMap((link) => [
    { id: link.source, title: link.sourceTitle },
    { id: link.target, title: link.targetTitle },
  ])
  .filter((item, index, arr) => arr.findIndex((t) => t.id === item.id) === index);

const nodeCardinality = new Map<string, number>();
linkSubset.forEach((link) => {
  nodeCardinality.set(link.source, (nodeCardinality.get(link.source) ?? 0) + 1);
  nodeCardinality.set(link.target, (nodeCardinality.get(link.target) ?? 0) + 1);
});

const edgeCardinality = new Map<string, number>();
linkSubset.forEach((link) => {
  const avgNodeCardinality = (nodeCardinality.get(link.source) ?? 0) + (nodeCardinality.get(link.target) ?? 0) / 2;
  edgeCardinality.set(link.source + link.target, avgNodeCardinality);
});

export const ClaimGraph: React.FC = () => {
  return (
    <div>
      <StyledHeader>Technical demo | Microsoft HITS</StyledHeader>
      <ForceGraph3D
        warmupTicks={10}
        d3AlphaDecay={0.1}
        cooldownTime={30000}
        enableNodeDrag={false}
        linkOpacity={0.08}
        graphData={{ nodes: nodeSubset, links: displayLinks }}
        nodeLabel={"title"}
        linkLabel={"label"}
        linkThreeObjectExtend={true}
      />
    </div>
  );
};

export default ClaimGraph;

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

const StyledHeader = styled.h1`
  color: white;
  background-color: black;
  padding: 2px;
  position: absolute;
  top: 80px;
  z-index: 100;
  left: 50%;
  transform: translateX(-50%);
`;
