import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "data-loader/src/serve";
import type React from "react";
import { useCallback, type ChangeEvent } from "react";
import { ForceGraph3D } from "react-force-graph";
import styled from "styled-components";

const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:5700",
    }),
  ],
});

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
  const handleSearchChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const claims = await trpc.searchClaims.query({ q: e.target.value });
    console.log(claims);
  }, []);

  return (
    <div>
      <WorkspaceGrid>
        <main className="viz">
          <ForceGraph3D
            enableNodeDrag={false}
            linkOpacity={0.2}
            graphData={{ nodes: [...nodeSubset], links: [...linkSubset] }}
            nodeLabel={"id"}
            linkLabel={"label"}
          />
        </main>
        <aside>
          <fieldset>
            <legend>Search</legend>
            <input type="search" onChange={handleSearchChange} />
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
