import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "data-loader/src/serve";
import type React from "react";
import { useCallback, useMemo, useState, type ChangeEvent } from "react";
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
    if (!e.target.value) {
      setSearchRestuls([]);
    } else {
      const claims = await trpc.searchClaims.query({ q: e.target.value });
      setSearchRestuls(claims);
    }
  }, []);

  const handleAddClaim = useCallback(
    async (claimId: string) => {
      if (graph.nodes.some((node) => node.id === claimId)) return;

      setGraph((graph) => ({
        ...graph,
        shouldAnimate: true,
        nodes: [...graph.nodes, { id: claimId, label: "test", isSelected: false }], // TODO source from db
      }));
    },
    [graph]
  );

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

  const selectedClaimNodes = useMemo(() => graph.nodes.filter((node) => node.isSelected), [graph.nodes]);

  const handleBackgroundClick = useCallback(() => {
    setGraph((graph) => ({
      ...graph,
      shouldAnimate: false,
      nodes: graph.nodes.map((node) => ({ ...node, isSelected: false })),
    }));
    setSearchRestuls([]);
  }, []);

  const getNodeColor = useCallback((node: DisplayNode) => {
    return node.isSelected ? "green" : "yellow";
  }, []);

  const handleRemoveAllNodes = useCallback(() => setGraph((graph) => ({ ...graph, nodes: [] })), []);

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
                <SearchResultItem key={result.claimId} onClick={() => handleAddClaim(result.claimId)}>
                  <LineClamp title={result.claimTitle}>{result.claimTitle}</LineClamp>
                </SearchResultItem>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Selection</legend>
            <menu>
              <button>Explore</button>
              <button>Remove</button>
              <button onClick={handleRemoveAllNodes}>Remove all</button>
            </menu>
            {selectedClaimNodes.map((node) => (
              <div key={node.id}>{node.label}</div>
            ))}
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

const SearchResultItem = styled.button`
  border: none;
  background: none;
  box-shadow: none;
  padding: 4px;
  text-align: left;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const LineClamp = styled.div`
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;
