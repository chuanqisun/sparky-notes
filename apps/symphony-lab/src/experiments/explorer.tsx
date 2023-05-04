import type React from "react";
import { ForceGraph3D } from "react-force-graph";
import styled from "styled-components";

export interface DisplayLink {
  source: string;
  target: string;
  label?: string;
}

export interface DisplayNode {
  id: string;
  label?: string;
}

const linkSubset: DisplayLink[] = [{ source: "1", target: "2", label: "test" }];
const nodeSubset: DisplayNode[] = [
  { id: "1", label: "node1" },
  { id: "2", label: "node2" },
  { id: "3", label: "node3" },
  { id: "4", label: "node4" },
];

export const Explorer: React.FC = () => {
  return (
    <div>
      <StyledHeader>Technical demo | Microsoft HITS</StyledHeader>
      <WorkspaceGrid>
        <div className="viz">
          <ForceGraph3D
            enableNodeDrag={false}
            linkOpacity={0.2}
            graphData={{ nodes: [...nodeSubset], links: [...linkSubset] }}
            nodeLabel={"id"}
            linkLabel={"label"}
          />
        </div>
        <ul>
          <li>test</li>
          <li>test</li>
          <li>test</li>
          <li>test</li>
        </ul>
      </WorkspaceGrid>
    </div>
  );
};

export default Explorer;

const WorkspaceGrid = styled.div`
  --panelheight: calc(calc(100vh - 57px));
  display: grid;
  gap: 1px;
  grid-template: "main side" var(--panelheight) / 1fr 0.25fr;

  .viz {
    overflow: hidden;
    grid-area: main;
  }

  .side {
    grid-area: side;
  }
`;

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
