import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "data-loader/src/serve";
import type React from "react";
import { useCallback, useState, type ChangeEvent } from "react";
import { ForceGraph3D } from "react-force-graph";
import styled from "styled-components";

const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:5700",
    }),
  ],
});

export interface DisplayGraph {
  nodes: DisplayNode[];
  links: DisplayLink[];
  shouldAnimate: boolean;
}

export interface DisplayLink {
  source: string;
  target: string;
  label?: string;
}

export interface DisplayNode {
  id: string;
  label?: string;
  isSelected?: boolean;
}

export const Explorer: React.FC = () => {
  const [graph, setGraph] = useState<DisplayGraph>({
    nodes: [],
    links: [],
    shouldAnimate: false,
  });

  const handleSearchChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const claims = await trpc.searchClaims.query({ q: e.target.value });
    setSearchRestuls(claims);
  }, []);

  const handleAddClaim = useCallback(async (claimId: string) => {
    setGraph((graph) => ({
      ...graph,
      shouldAnimate: true,
      nodes: [...graph.nodes, { id: claimId, label: "test", isSelected: false }], // TODO source from db
    }));
  }, []);

  const handleNodeClick = useCallback((node: DisplayNode) => {
    setGraph((graph) => ({
      ...graph,
      shouldAnimate: false,
      nodes: graph.nodes.map((existingNode) =>
        existingNode.id === node.id
          ? {
              ...existingNode,
              isSelected: !existingNode.isSelected,
            }
          : existingNode
      ),
    }));
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setGraph((graph) => ({
      ...graph,
      nodes: graph.nodes.map((node) => ({ ...node, isSelected: false })),
    }));
  }, []);

  const getNodeColor = useCallback((node: DisplayNode) => {
    return node.isSelected ? "green" : "yellow";
  }, []);

  const [searchResults, setSearchRestuls] = useState<{ claimId: string; claimTitle: string }[]>([]);

  return (
    <div>
      <WorkspaceGrid>
        <main className="viz">
          <ForceGraph3D
            enableNodeDrag={false}
            graphData={graph}
            nodeLabel={"id"}
            cooldownTicks={graph.shouldAnimate ? 10 : 0}
            linkLabel={"label"}
            onBackgroundClick={handleBackgroundClick}
            onNodeClick={handleNodeClick}
            nodeColor={getNodeColor}
          />
        </main>
        <aside>
          <fieldset>
            <legend>Search</legend>
            <input type="search" onChange={handleSearchChange} />
            <div>
              {searchResults.map((result) => (
                <button key={result.claimId} onClick={() => handleAddClaim(result.claimId)}>
                  {result.claimTitle}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Selection</legend>
            <menu>
              <button>Explore</button>
              <button>Remove</button>
            </menu>
          </fieldset>
        </aside>
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
