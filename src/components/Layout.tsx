import { Outlet, useLocation } from "react-router-dom";
import { Header, TabLeiste } from "./Header";
import { Footer } from "./Footer";
import { YearBar } from "./YearBar";
import { YearUrlSync } from "@/lib/year";

// Routes whose main content reacts to the global Stichjahr.
const YEAR_ROUTES = ["/", "/erkunden", "/einzelplan/", "/wofuer-zahle-ich"];
// Of those, the routes with lists that can show official numbers.
const NUMMERN_ROUTES = ["/", "/einzelplan/", "/erkunden/einnahmen", "/erkunden/investitionen", "/erkunden/querschnitte"];

const passt = (routes: string[], pathname: string) =>
  routes.some((r) => (r === "/" ? pathname === "/" : pathname.startsWith(r)));

export function Layout() {
  const { pathname } = useLocation();
  const showYear = passt(YEAR_ROUTES, pathname);
  return (
    // Bottom padding below lg keeps the footer clear of the fixed tab bar.
    // overflow-x-clip: a long script word may run past a narrow screen; clip
    // (unlike hidden) creates no scroll container, so sticky bars keep working.
    <div className="min-h-screen flex flex-col overflow-x-clip pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <a href="#inhalt" className="skip-link">Zum Inhalt springen</a>
      <YearUrlSync />
      <Header />
      {showYear && (
        <div className="sticky top-[var(--kopf-hoehe)] z-10">
          <YearBar nummern={passt(NUMMERN_ROUTES, pathname)} />
        </div>
      )}
      <main id="inhalt" className="flex-1 mx-auto w-full max-w-6xl px-5 py-8">
        <Outlet />
      </main>
      <Footer />
      <TabLeiste />
    </div>
  );
}
