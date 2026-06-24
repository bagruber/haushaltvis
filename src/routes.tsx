import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Themen } from "./pages/Themen";
import { ThemeDetail } from "./pages/ThemeDetail";
import { Info } from "./pages/Info";

export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { path: "/", element: <Home /> },
        { path: "/themen", element: <Themen /> },
        { path: "/themen/:id", element: <ThemeDetail /> },
        { path: "/info", element: <Info /> },
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: "/haushaltvis" },
);
