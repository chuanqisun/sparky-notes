import React from "react";
import ReactDOM from "react-dom/client";
import { Link, Outlet, RouterProvider, createBrowserRouter, type NonIndexRouteObject } from "react-router-dom";
import { AccountContextProvider } from "./account/account-context";
import "./index.css";
import { Main } from "./shell/main";
import { Nav } from "./shell/nav";

interface NamedRoute extends NonIndexRouteObject {
  displayName: string;
}

const ROUTES: NamedRoute[] = [
  {
    displayName: "Ontology",
    path: "/experiments/ontology",
    lazy: () => import("./experiments/ontology").then(({ Ontology }) => ({ Component: Ontology })),
  },
  {
    displayName: "Three graph",
    path: "/experiments/three-graph",
    lazy: () => import("./experiments/three-graph").then(({ ThreeGraph }) => ({ Component: ThreeGraph })),
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
    <nav>
      {ROUTES.map((route) => (
        <span key={route.path}>
          <Link to={route.path as string}>{route.displayName}</Link>{" "}
        </span>
      ))}
    </nav>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AccountContextProvider>
      <RouterProvider router={router} />
    </AccountContextProvider>
  </React.StrictMode>
);
