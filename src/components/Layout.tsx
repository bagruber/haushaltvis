import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { YearBar } from "./YearBar";

// Routes whose main content reacts to the global Stichjahr.
const YEAR_ROUTES = ["/", "/erkunden", "/einnahmen", "/investitionen", "/themen/", "/einzelplan/"];

export function Layout() {
  const { pathname } = useLocation();
  const showYear = YEAR_ROUTES.some((r) => (r === "/" ? pathname === "/" : pathname.startsWith(r)));
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {showYear && (
        <div className="sticky top-[57px] z-10">
          <YearBar />
        </div>
      )}
      <main className="flex-1 mx-auto w-full max-w-6xl px-5 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
