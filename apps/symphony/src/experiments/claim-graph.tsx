import type React from "react";
import { useEffect, useState } from "react";
import { ForceGraph3D } from "react-force-graph";
import styled from "styled-components";

async function loadData() {
  const dataset = await fetch("/data/graph-viz-export.json").then((res) => res.json());

  const { claimToClaimEdge } = dataset as any;

  // console.log(predicateEdges, similarityEdges);

  function randomSampleArray(a: any[], count: number) {
    const shuffled = a.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  const linkSubset = [...randomSampleArray(claimToClaimEdge, 800)] as {
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

  return {
    nodeSubset,
    displayLinks,
  };
}

export const ClaimGraph: React.FC = () => {
  const [graph, setGraph] = useState<any>({
    nodes: [],
    links: [],
  });
  useEffect(() => {
    loadData().then((data) => {
      setGraph({
        nodes: data.nodeSubset,
        links: data.displayLinks,
      });
    });
  }, []);

  return (
    <div>
      <StyledHeader>Technical demo | Microsoft HITS</StyledHeader>
      <ForceGraph3D
        warmupTicks={10}
        d3AlphaDecay={0.05}
        cooldownTime={12000}
        enableNodeDrag={false}
        linkOpacity={0.08}
        graphData={graph}
        nodeLabel={"title"}
        linkLabel={"label"}
        linkThreeObjectExtend={true}
      />
    </div>
  );
};

export default ClaimGraph;

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
