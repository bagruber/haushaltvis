import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Geldfluss } from "./pages/Geldfluss";
import { Themen } from "./pages/Themen";
import { ThemeDetail } from "./pages/ThemeDetail";
import { PostenDetail } from "./pages/PostenDetail";
import { EinrichtungDetail } from "./pages/EinrichtungDetail";
import { Info } from "./pages/Info";

export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { path: "/", element: <Home /> },
        { path: "/geldfluss", element: <Geldfluss /> },
        { path: "/themen", element: <Themen /> },
        { path: "/themen/:id", element: <ThemeDetail /> },
        { path: "/posten/:id", element: <PostenDetail /> },
        { path: "/einrichtung/:glz", element: <EinrichtungDetail /> },
        { path: "/info", element: <Info /> },
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: "/haushaltvis" },
);
