import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Themen } from "./pages/Themen";
import { Info } from "./pages/Info";

export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { path: "/", element: <Home /> },
        { path: "/themen", element: <Themen /> },
        { path: "/info", element: <Info /> },
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: "/haushaltvis" },
);
