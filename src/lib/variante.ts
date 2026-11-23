/**
 * Zwei Builds aus einem Stand. Die Ratsversion zeigt alles, auch was noch
 * nicht beschlossen ist. Die Bürgerversion (`VITE_VARIANTE=buerger`) zeigt nur
 * Beschlossenes: ohne Entwurf und Finanzplan, ohne unterjährige
 * Zwischenstände, ohne den Wortlaut der Erläuterungen und ohne die
 * Gesamtliste. Die Daten dazu fehlen dort ganz (scripts/buerger.mjs); hier
 * wird nur weggelassen, was ohne sie leer bliebe.
 */
export const buerger = import.meta.env.VITE_VARIANTE === "buerger";
