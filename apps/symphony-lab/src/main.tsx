import React from "react";
import ReactDOM from "react-dom/client";
import { Link, Outlet, RouterProvider, createBrowserRouter, type NonIndexRouteObject } from "react-router-dom";
import { styled } from "styled-components";
import { AccountContextProvider } from "./account/account-context";
import { AuthContextProvider } from "./account/auth-context";
import { Cozo, createDb } from "./cozo/cozo";
import { SCHEMA, getGraphOutputs, setGraphOutput } from "./flow/db/db";
import "./index.css";
import { Main } from "./shell/main";
import { Nav } from "./shell/nav";

interface NamedRoute extends NonIndexRouteObject {
  displayName: string;
}

const ROUTES: NamedRoute[] = [
  {
    displayName: "Ontology graph",
    path: "/experiments/ontology-graph",
    lazy: () => import("./experiments/ontology-graph").then(({ OntologyGraph }) => ({ Component: OntologyGraph })),
  },
  {
    displayName: "Claim graph",
    path: "/experiments/claim-graph",
    lazy: () => import("./experiments/claim-graph").then(({ ClaimGraph }) => ({ Component: ClaimGraph })),
  },
  {
    displayName: "Visual explorer",
    path: "/experiments/visual-explorer",
    lazy: () => import("./experiments/visual-explorer").then(({ VisualExplorer }) => ({ Component: VisualExplorer })),
  },
  {
    displayName: "Ontology builder",
    path: "/experiments/ontology-builder",
    lazy: () => import("./experiments/ontology-builder").then(({ OntologyBuilder }) => ({ Component: OntologyBuilder })),
  },
  {
    displayName: "Basic shelf",
    path: "/experiments/basic-shelf",
    lazy: () =>
      import("./experiments/basic-shelf")
        .then(async ({ BasicShelf }) => ({ BasicShelf, db: await createDb() }))
        .then(({ BasicShelf, db }) => {
          return { Component: () => <BasicShelf db={db} /> };
        }),
  },
  {
    displayName: "Shelf flow",
    path: "/experiments/shelf-flow",
    lazy: () =>
      import("./experiments/shelf-flow")
        .then(async ({ ShelfFlow }) => ({ ShelfFlow, db: await createDb() }))
        .then(({ ShelfFlow, db }) => {
          const graph = new Cozo(db, SCHEMA);
          testGraph(graph);
          return { Component: () => <ShelfFlow graph={graph} /> };
        }),
  },
];

function testGraph(graph: Cozo) {
  // test putting a graph output item
  setGraphOutput(graph, "node_1", { id: "item_1", position: 0, data: { key: "value" }, sourceIds: ["item_10", "item_23"] });
  // test getting a graph output item
  getGraphOutputs(graph, "node_1");
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: ROUTES,
  },
]);

function App() {
  return (
    <AppLayout>
      <Nav />
      <Main>
        <ExperimentList />
        <Outlet />
      </Main>
    </AppLayout>
  );
}

function ExperimentList() {
  return (
    <StyledNav>
      {ROUTES.map((route, index) => (
        <span key={route.path}>
          <Link to={route.path as string}>{route.displayName}</Link>
          {index < ROUTES.length - 1 ? " · " : ""}
        </span>
      ))}
    </StyledNav>
  );
}

const AppLayout = styled.div`
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
`;

const StyledNav = styled.nav`
  padding: 4px 8px;
  background-color: ButtonFace;
  border-bottom: 1px solid ButtonBorder;
`;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthContextProvider>
      <AccountContextProvider>
        <RouterProvider router={router} />
      </AccountContextProvider>
    </AuthContextProvider>
  </React.StrictMode>
);
