import React from "react";
import ReactDOM from "react-dom/client";
import { Link, Outlet, RouterProvider, createBrowserRouter, type NonIndexRouteObject } from "react-router-dom";
import { styled } from "styled-components";
import { AccountContextProvider } from "./account/account-context";
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
];

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: ROUTES,
  },
]);

function App() {
  return (
    <>
      <Nav />
      <Main>
        <ExperimentList />
        <Outlet />
      </Main>
    </>
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

const StyledNav = styled.nav`
  padding: 4px 8px;
  background-color: ButtonFace;
  border-bottom: 1px solid ButtonBorder;
`;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AccountContextProvider>
      <RouterProvider router={router} />
    </AccountContextProvider>
  </React.StrictMode>
);
