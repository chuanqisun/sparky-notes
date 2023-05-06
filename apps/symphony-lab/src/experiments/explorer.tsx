import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "data-loader/src/serve";
import type React from "react";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
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
  links: DisplayEdge[];
  shouldAnimate: boolean;
}

export interface DisplayEdge {
  source: string;
  target: string;
  weight: number;
  type: string;
  label?: string;
}

export interface DisplayNode {
  id: string;
  label?: string;
  isSelected?: boolean;
  isExplored?: boolean;
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
    async (claimId: string, claimTitle: string) => {
      if (graph.nodes.some((node) => node.id === claimId)) return;

      setGraph((graph) => ({
        ...graph,
        shouldAnimate: true,
        nodes: [...graph.nodes, { id: claimId, label: claimTitle, isSelected: false }],
      }));
    },
    [graph]
  );

  const handleNodeClick = useCallback((node: DisplayNode, multiselect?: boolean) => {
    setGraph((graph) => {
      graph.nodes.forEach((existingNode) => {
        existingNode.isSelected = existingNode.id === node.id ? !existingNode.isSelected : multiselect ? existingNode.isSelected : false;
      });

      return {
        ...graph,
        nodes: [...graph.nodes],
        links: [...graph.links],
        shouldAnimate: false,
      };
    });
  }, []);

  const selectedClaimNodes = useMemo(() => graph.nodes.filter((node) => node.isSelected), [graph.nodes]);

  const handleBackgroundClick = useCallback(() => {
    setGraph((graph) => {
      graph.nodes.forEach((existingNode) => {
        existingNode.isSelected = false;
      });
      return {
        ...graph,
        shouldAnimate: false,
        nodes: [...graph.nodes],
        links: [...graph.links],
      };
    });
    setSearchRestuls([]);
  }, []);

  const getNodeColor = useCallback((node: DisplayNode) => {
    switch (true) {
      case node.isSelected:
        return "white";
      case node.isExplored:
        return "green";
      default:
        return "yellow";
    }
  }, []);

  const handleMapAllNodes = useCallback(async () => {
    const exploreBaseNodes = graph.nodes.filter((node) => !node.isExplored);
    const selectedNodes = exploreBaseNodes.filter((node) => node.isSelected);
    const exploreNodes = selectedNodes.length ? selectedNodes : exploreBaseNodes;
    console.log("Exploring...", exploreNodes);

    const result = await trpc.scanClaim.query({ claimIds: exploreNodes.map((node) => node.id) });
    console.log("Found", result);

    setGraph((graph) => {
      const allNodes = result.flatMap((edge) => [
        {
          id: edge.fromId,
          label: edge.fromTitle,
          isSelected: false,
          isExplored: false,
        },
        {
          id: edge.toId,
          label: edge.toTitle,
          isSelected: false,
          isExplored: false,
        },
      ]);
      const newNodes = allNodes
        .filter((node) => !graph.nodes.some((existingNode) => existingNode.id === node.id)) // new
        .filter((node, index, arr) => arr.findIndex((n) => n.id === node.id) === index); // unique

      const allEdges: DisplayEdge[] = result.map((edge) => ({
        source: edge.fromId,
        target: edge.toId,
        weight: edge.score,
        type: edge.type.includes("onto") ? "onto" : "sim",
        label: edge.type.join("+") + " @" + edge.score.toString(),
      }));

      const newEdges = allEdges.filter(
        (edge) =>
          !graph.links.some((existingEdge) =>
            [`${existingEdge.source}-${existingEdge.target}`, `${existingEdge.target}-${existingEdge.source}`].includes(`${edge.source}+${edge.target}`)
          )
      );

      graph.nodes.forEach((existingNode) => {
        existingNode.isExplored = existingNode.isExplored || exploreNodes.some((node) => node.id === existingNode.id);
      });

      const newGraph = {
        ...graph,
        shouldAnimate: true,
        nodes: [...graph.nodes, ...newNodes],
        links: [...graph.links, ...newEdges],
      };

      return newGraph;
    });
  }, [graph]);

  useEffect(() => console.log(graph), [graph]);

  const handleRemoveAllNodes = useCallback(() => {
    const selectedNodes = graph.nodes.filter((node) => node.isSelected);

    setGraph((graph) => {
      if (!selectedNodes.length) {
        return { ...graph, nodes: [], links: [] };
      } else {
        const keepLinks = graph.links.filter(
          (link) => !selectedNodes.some((node) => node.id === (link.source as any).id || node.id === (link.target as any).id) // the engine wraps the underlying id
        );
        console.log("debug", keepLinks);
        return {
          ...graph,
          nodes: graph.nodes.filter((node) => !selectedNodes.includes(node)),
          links: keepLinks,
        };
      }
    });
  }, [graph]);

  const [searchResults, setSearchRestuls] = useState<{ claimId: string; claimTitle: string }[]>([]);

  return (
    <div>
      <WorkspaceGrid>
        <main className="viz">
          <ForceGraph3D
            enableNodeDrag={false}
            graphData={graph}
            nodeLabel={"label"}
            cooldownTicks={graph.shouldAnimate ? 1000 : 0}
            linkLabel={"label"}
            linkOpacity={0.5}
            onBackgroundClick={handleBackgroundClick}
            onNodeClick={(n, e) => handleNodeClick(n, e.shiftKey)}
            linkWidth={(l) => l.weight ?? 1}
            linkColor={(l) => (l.type === "onto" ? "teal" : "purple")}
            nodeColor={getNodeColor}
          />
        </main>
        <aside>
          <fieldset>
            <legend>Search</legend>
            <input type="search" onChange={handleSearchChange} />
            <div>
              {searchResults.map((result) => (
                <SearchResultItem key={result.claimId} onClick={() => handleAddClaim(result.claimId, result.claimTitle)}>
                  <LineClamp title={result.claimTitle}>{result.claimTitle}</LineClamp>
                </SearchResultItem>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Knowledge Cartographer</legend>
            <StyledMenu>
              <button onClick={handleMapAllNodes}>Map {selectedClaimNodes.length ? `${selectedClaimNodes.length} selected` : "all"}</button>
            </StyledMenu>
            <StyledMenu>
              <button onClick={handleRemoveAllNodes}>Remove {selectedClaimNodes.length ? `${selectedClaimNodes.length} selected` : "all"}</button>
              <button onClick={() => {}}>Interpret</button>
              <button onClick={() => {}}>Filter</button>
            </StyledMenu>
          </fieldset>
          <fieldset>
            <legend>Selection</legend>
            {selectedClaimNodes.map((node) => (
              <ClampListItem key={node.id}>
                <LineClamp title={node.label}>{node.label}</LineClamp>
              </ClampListItem>
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

const StyledMenu = styled.menu`
  padding: 0;
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

const ClampListItem = styled.div`
  padding: 4px;
`;

const LineClamp = styled.div`
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;
