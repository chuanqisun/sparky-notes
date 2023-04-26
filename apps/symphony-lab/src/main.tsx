import React from "react";
import ReactDOM from "react-dom/client";
import { Link, Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AccountContextProvider } from "./account/account-context";
import "./index.css";
import { Main } from "./shell/main";
import { Nav } from "./shell/nav";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/experiments/ontology",
        lazy: () => import("./experiments/ontology").then(({ Ontology }) => ({ Component: Ontology })),
      },
    ],
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
    <ul>
      <li>
        <Link to="/experiments/ontology">Ontology</Link>
      </li>
    </ul>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AccountContextProvider>
      <RouterProvider router={router} />
    </AccountContextProvider>
  </React.StrictMode>
);
