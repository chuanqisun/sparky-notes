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
    displayName: "Basic",
    path: "/experiments/basic",
    lazy: () => import("./experiments/basic").then(({ Basic: Ontology }) => ({ Component: Ontology })),
  },
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
    displayName: "Explorer",
    path: "/experiments/explorer",
    lazy: () => import("./experiments/explorer").then(({ Explorer }) => ({ Component: Explorer })),
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
