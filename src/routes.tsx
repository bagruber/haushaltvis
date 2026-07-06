import { lazy, Suspense } from "react";
import { createBrowserRouter, createHashRouter, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Loading } from "./components/ui";

// Temporäres internes Werkzeug — lazy, damit es die Bürger-App nicht aufbläht.
const Zuordnung = lazy(() => import("./pages/intern/Zuordnung"));
import { Home } from "./pages/Home";
import { Erkunden } from "./pages/Erkunden";
import { Einnahmen } from "./pages/Einnahmen";
import { Investitionen } from "./pages/Investitionen";
import { WofuerZahleIch } from "./pages/WofuerZahleIch";
import { EinzelplanDetail } from "./pages/EinzelplanDetail";
import { Themen } from "./pages/Themen";
import { ThemeDetail } from "./pages/ThemeDetail";
import { PostenDetail } from "./pages/PostenDetail";
import { EinrichtungDetail } from "./pages/EinrichtungDetail";
import { Info } from "./pages/Info";
import { Methodik } from "./pages/Methodik";
import { Impressum, Datenschutz, Barrierefreiheit } from "./pages/Rechtliches";

const routes = [
    {
      element: <Layout />,
      children: [
        { path: "/", element: <Home /> },
        { path: "/erkunden", element: <Erkunden /> },
        { path: "/einnahmen", element: <Einnahmen /> },
        { path: "/investitionen", element: <Investitionen /> },
        { path: "/wofuer-zahle-ich", element: <WofuerZahleIch /> },
        { path: "/einzelplan/:ep", element: <EinzelplanDetail /> },
        { path: "/geldfluss", element: <Navigate to="/erkunden" replace /> },
        { path: "/themen", element: <Themen /> },
        { path: "/themen/:id", element: <ThemeDetail /> },
        { path: "/posten/:id", element: <PostenDetail /> },
        { path: "/einrichtung/:glz", element: <EinrichtungDetail /> },
        { path: "/info", element: <Info /> },
        { path: "/methodik", element: <Methodik /> },
        { path: "/impressum", element: <Impressum /> },
        { path: "/datenschutz", element: <Datenschutz /> },
        { path: "/barrierefreiheit", element: <Barrierefreiheit /> },
        { path: "/intern/zuordnung", element: <Suspense fallback={<Loading />}><Zuordnung /></Suspense> },
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ];

// Default: BrowserRouter mit sauberen URLs, folgt Vite's `base` (GitHub Pages,
// städtisches Hosting später). Mit VITE_ROUTER=hash: Hash-Routing — mount-pfad-
// unabhängig, läuft aus jedem beliebigen Unterordner ohne Server-Rewrite
// (für das relative, portable Demo-Paket).
export const router =
  import.meta.env.VITE_ROUTER === "hash"
    ? createHashRouter(routes)
    : createBrowserRouter(routes, { basename: import.meta.env.BASE_URL.replace(/\/$/, "") });
