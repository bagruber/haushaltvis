import { Outlet, useLocation } from "react-router-dom";
import { Header, TabLeiste } from "./Header";
import { Footer } from "./Footer";
import { YearBar } from "./YearBar";
import { YearUrlSync } from "@/lib/year";

// Routes whose main content reacts to the global Stichjahr.
const YEAR_ROUTES = ["/", "/erkunden", "/einzelplan/", "/wofuer-zahle-ich"];

export function Layout() {
  const { pathname } = useLocation();
  const showYear = YEAR_ROUTES.some((r) => (r === "/" ? pathname === "/" : pathname.startsWith(r)));
  return (
    // Bottom padding below lg keeps the footer clear of the fixed tab bar.
    <div className="min-h-screen flex flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <a href="#inhalt" className="skip-link">Zum Inhalt springen</a>
      <YearUrlSync />
      <Header />
      {showYear && (
        <div className="sticky top-[var(--kopf-hoehe)] z-10">
          <YearBar />
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
