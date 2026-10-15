// Adressen aus Namen. Reines JavaScript, weil scripts/karten.mjs unter Node
// dieselbe Regel braucht: Seite, Suche und Vorschaukarte müssen für eine
// Einnahmeart auf dieselbe Adresse kommen, sonst führt einer der drei ins Leere.

/**
 * Address-safe identifier for a section whose data key is a name, not a code
 * (the Einnahmen groups: "Schlüsselzuweisungen & Finanzausgleich"). Umlauts
 * are spelled out so the identifier survives file systems and copy-paste.
 * @param {string} name
 * @returns {string}
 */
export function kennung(name) {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
