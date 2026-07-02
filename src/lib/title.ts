import { useEffect } from "react";

const SITE = "Haushalt Moosburg";
const DEFAULT = `${SITE} — Wohin fließt das Geld?`;

/**
 * Per-page document title (tabs, bookmarks, screen-reader announcement).
 * Pass nothing while a page is still loading; the site default stays.
 */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : DEFAULT;
    return () => {
      document.title = DEFAULT;
    };
  }, [title]);
}
