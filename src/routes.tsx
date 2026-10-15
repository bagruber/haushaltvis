import { lazy, Suspense } from "react";
import { createBrowserRouter, createHashRouter, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Loading } from "./components/ui";

// Temporäre interne Seiten — lazy, damit sie die Bürger-App nicht aufblähen.
const Zuordnung = lazy(() => import("./pages/intern/Zuordnung"));
// Themen-Feature: nicht freigegebene Zuordnung, daher unverlinkt und nur intern.
const ThemenVorschau = lazy(() => import("./pages/intern/ThemenVorschau"));
const ThemeDetail = lazy(() => import("./pages/ThemeDetail").then((m) => ({ default: m.ThemeDetail })));
import { Home } from "./pages/Home";
import { ErkundenLayout } from "./pages/ErkundenLayout";
import { Erkunden } from "./pages/Erkunden";
import { Einnahmen } from "./pages/Einnahmen";
import { Investitionen } from "./pages/Investitionen";
import { Querschnitte } from "./pages/Querschnitte";
import { WofuerZahleIch } from "./pages/WofuerZahleIch";
import { Gesamtliste } from "./pages/Gesamtliste";
import { EinzelplanDetail } from "./pages/EinzelplanDetail";
import { Themen } from "./pages/Themen";
import { PostenDetail } from "./pages/PostenDetail";
import { EinrichtungDetail } from "./pages/EinrichtungDetail";
import { Info } from "./pages/Info";
import { Methodik } from "./pages/Methodik";
import { Glossar } from "./pages/Glossar";
import { Impressum, Datenschutz, Barrierefreiheit } from "./pages/Rechtliches";

const routes = [
    {
      element: <Layout />,
      children: [
        { path: "/", element: <Home /> },
        // Teilbare Abschnitte stehen im Pfad, nicht im Hash und nicht in der
        // Query: nur so hat jeder Abschnitt eine eigene Adresse, unter der eine
        // eigene HTML-Datei mit eigener Vorschaukarte liegen kann (scripts/karten.mjs).
        { path: "/ueberblick/:teil", element: <Home /> },
        {
          path: "/erkunden",
          element: <ErkundenLayout />,
          children: [
            { index: true, element: <Erkunden /> },
            { path: "einnahmen/:teil?", element: <Einnahmen /> },
            { path: "investitionen/:teil?", element: <Investitionen /> },
            { path: "querschnitte/:teil?", element: <Querschnitte /> },
            // Die Stellenzahl der Kennung sagt die Ebene: 2, 21, 5701.
            { path: "gesamtliste/:teil?", element: <Gesamtliste /> },
          ],
        },
        { path: "/wofuer-zahle-ich", element: <WofuerZahleIch /> },
        { path: "/gesamtliste", element: <Navigate to="/erkunden/gesamtliste" replace /> },
        { path: "/einzelplan/:ep", element: <EinzelplanDetail /> },
        // Der Bereich (2-stellige Gliederung) neben /einrichtung und /posten:
        // jede Haushaltsebene hat damit ihre kurze Adresse.
        { path: "/bereich/:ab", element: <EinzelplanDetail /> },
        { path: "/geldfluss", element: <Navigate to="/erkunden" replace /> },
        { path: "/einnahmen", element: <Navigate to="/erkunden/einnahmen" replace /> },
        { path: "/investitionen", element: <Navigate to="/erkunden/investitionen" replace /> },
        { path: "/themen", element: <Themen /> },
        // Themen-Detail bleibt gesperrt, solange die Zuordnung nicht freigegeben ist.
        { path: "/themen/:id", element: <Navigate to="/themen" replace /> },
        { path: "/posten/:id", element: <PostenDetail /> },
        { path: "/einrichtung/:glz", element: <EinrichtungDetail /> },
        { path: "/info", element: <Info /> },
        { path: "/methodik", element: <Methodik /> },
        { path: "/glossar/:teil?", element: <Glossar /> },
        { path: "/impressum", element: <Impressum /> },
        { path: "/datenschutz", element: <Datenschutz /> },
        { path: "/barrierefreiheit", element: <Barrierefreiheit /> },
        { path: "/intern/zuordnung", element: <Suspense fallback={<Loading />}><Zuordnung /></Suspense> },
        { path: "/intern/themen", element: <Suspense fallback={<Loading />}><ThemenVorschau /></Suspense> },
        { path: "/intern/themen/:id", element: <Suspense fallback={<Loading />}><ThemeDetail /></Suspense> },
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
