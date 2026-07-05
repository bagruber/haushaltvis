import { useEffect, useMemo, useRef, useState } from "react";
import { useData, latestYear, type Data } from "@/lib/data";
import { usePageTitle } from "@/lib/title";
import { Loading } from "@/components/ui";
import { fmtEurShort } from "@/lib/format";

// Internes Arbeitswerkzeug zur thematischen Zuordnung. Temporär, unverlinkt.
// Zustand bleibt lokal (localStorage); Übernahme nur per Export.

const LS_KEY = "zuordnung-v1";

type Assign = Record<string, string[]>; // itemId (glz oder hhst) -> theme-ids
const isPosten = (id: string) => id.includes(".");

interface PostenNode { hhst: string; label: string; amount: number }
interface GlzNode { glz: string; label: string; amount: number; posten: PostenNode[] }
interface EpNode { ep: string; name: string; amount: number; glzs: GlzNode[] }

function buildTree(data: Data): { tree: EpNode[]; labelOf: Map<string, string>; amountOf: Map<string, number> } {
  const y = latestYear(data.budget);
  const amt = new Map<string, number>(); // hhst -> ansatz (Stichjahr)
  for (const f of data.budget.facts) if (f.year === y && f.ansatz != null) amt.set(f.hhst_id, Math.abs(f.ansatz));

  const eps = new Map<string, EpNode>();
  const glzMap = new Map<string, GlzNode>();
  const labelOf = new Map<string, string>();
  const amountOf = new Map<string, number>();

  for (const p of Object.values(data.budget.posten)) {
    const a = amt.get(p.hhst_id) ?? 0;
    let ep = eps.get(p.einzelplan);
    if (!ep) { ep = { ep: p.einzelplan, name: p.einzelplan_name, amount: 0, glzs: [] }; eps.set(p.einzelplan, ep); }
    let g = glzMap.get(p.glz);
    if (!g) {
      g = { glz: p.glz, label: (p.glz_text ?? p.glz).replace(/\s+/g, " ").trim(), amount: 0, posten: [] };
      glzMap.set(p.glz, g);
      ep.glzs.push(g);
      labelOf.set(p.glz, `${g.label} [${p.glz}]`);
    }
    const label = (p.grz_text ?? p.hhst_id).replace(/\s+/g, " ").trim();
    g.posten.push({ hhst: p.hhst_id, label, amount: a });
    labelOf.set(p.hhst_id, `${label} · ${g.label}`);
    amountOf.set(p.hhst_id, a);
    g.amount += a;
    ep.amount += a;
  }
  for (const g of glzMap.values()) { g.posten.sort((x, y) => y.amount - x.amount); amountOf.set(g.glz, g.amount); }
  const tree = [...eps.values()].sort((a, b) => a.ep.localeCompare(b.ep));
  for (const ep of tree) ep.glzs.sort((a, b) => b.amount - a.amount);
  return { tree, labelOf, amountOf };
}

function seedFromCurrent(data: Data): Assign {
  const byGlz = new Map<string, Set<string>>();
  for (const p of Object.values(data.budget.posten)) {
    const tags = data.themes.assignment[p.hhst_id]?.map((t) => t.theme) ?? [];
    if (!byGlz.has(p.glz)) byGlz.set(p.glz, new Set());
    tags.forEach((t) => byGlz.get(p.glz)!.add(t));
  }
  const a: Assign = {};
  for (const [glz, s] of byGlz) if (s.size) a[glz] = [...s];
  return a;
}

export default function Zuordnung() {
  usePageTitle("Themen-Zuordnung (intern)");
  const { data, error } = useData();
  const [assign, setAssign] = useState<Assign>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const seeded = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { tree, labelOf, amountOf } = useMemo(() => (data ? buildTree(data) : { tree: [], labelOf: new Map(), amountOf: new Map() }), [data]);
  const themes = data?.themes.themes ?? {};

  // seed once from localStorage or current assignment
  useEffect(() => {
    if (!data || seeded.current) return;
    seeded.current = true;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { setAssign(JSON.parse(raw)); return; }
    } catch { /* ignore */ }
    setAssign(seedFromCurrent(data));
  }, [data]);

  useEffect(() => {
    if (seeded.current) try { localStorage.setItem(LS_KEY, JSON.stringify(assign)); } catch { /* ignore */ }
  }, [assign]);

  const add = (id: string, theme: string) => setAssign((a) => {
    const cur = new Set(a[id] ?? []); cur.add(theme); return { ...a, [id]: [...cur] };
  });
  const remove = (id: string, theme: string) => setAssign((a) => {
    const cur = (a[id] ?? []).filter((t) => t !== theme);
    const next = { ...a }; if (cur.length) next[id] = cur; else delete next[id]; return next;
  });

  // invert: theme -> itemIds
  const byTheme = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const [id, ts] of Object.entries(assign)) for (const t of ts) (m[t] ??= []).push(id);
    for (const t of Object.keys(m)) m[t].sort((a, b) => (amountOf.get(b) ?? 0) - (amountOf.get(a) ?? 0));
    return m;
  }, [assign, amountOf]);

  const q = query.trim().toLowerCase();
  const matches = (s: string) => s.toLowerCase().includes(q);
  const visible = (id: string, label: string) => (!q || matches(label) || matches(id)) && (!onlyOpen || !(assign[id]?.length));

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!data) return <Loading />;

  // coverage
  const totalGlz = tree.reduce((s, e) => s + e.glzs.length, 0);
  const assignedGlz = new Set(Object.keys(assign).filter((id) => !isPosten(id))).size;

  const dot = (theme: string, hollow = false) => (
    <span key={theme} title={themes[theme]?.label}
      className="inline-block h-2.5 w-2.5 rounded-full align-middle"
      style={hollow ? { border: `2px solid ${themes[theme]?.color}` } : { background: themes[theme]?.color }} />
  );

  const Row = ({ id, label, amount, depth }: { id: string; label: string; amount: number; depth: number }) => (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", id); e.dataTransfer.effectAllowed = "copy"; }}
      onClick={() => setSelected((s) => (s === id ? null : id))}
      className={"flex items-center gap-2 rounded px-1.5 py-0.5 cursor-grab active:cursor-grabbing " + (selected === id ? "bg-gold-200/60 ring-1 ring-gold-500" : "hover:bg-cream-dark")}
      style={{ paddingLeft: depth * 14 + 6 }}
      title="Ziehen auf ein Thema — oder anklicken und dann ein Thema wählen"
    >
      <span className="flex-1 min-w-0 truncate text-sm">{label}</span>
      <span className="flex gap-0.5 shrink-0">{(assign[id] ?? []).map((t) => dot(t))}</span>
      <span className="w-16 shrink-0 text-right tabular-nums text-xs text-ink-muted">{amount ? fmtEurShort(amount) : ""}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold">Themen-Zuordnung <span className="text-ink-muted text-base font-normal">(internes Werkzeug)</span></h1>
        <p className="text-sm text-ink-soft max-w-3xl">
          Unterabschnitte und Einzelposten links auf die Themen-Buckets rechts ziehen (oder anklicken, dann Thema wählen).
          Mehrfachzuordnung möglich. Änderungen bleiben nur in <b>diesem Browser</b> gespeichert — mit <b>Export</b> sichern und später einpflegen.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Suchen…"
          className="rounded-md border border-ink-line bg-white px-3 py-1.5 w-48" />
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> nur unzugeordnete</label>
        <span className="text-ink-muted">{assignedGlz}/{totalGlz} Unterabschnitte zugeordnet</span>
        <span className="flex-1" />
        <button onClick={() => exportJson(assign)} className="rounded-md bg-ink text-cream px-3 py-1.5">Export JSON</button>
        <button onClick={() => exportYaml(assign)} className="rounded-md border border-ink-line px-3 py-1.5">Export YAML</button>
        <button onClick={() => fileRef.current?.click()} className="rounded-md border border-ink-line px-3 py-1.5">Import</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => importJson(e, setAssign)} />
        <button onClick={() => { if (confirm("Zuordnung zurücksetzen auf den aktuellen Stand?")) setAssign(seedFromCurrent(data)); }}
          className="rounded-md border border-ink-line px-3 py-1.5 text-red-600">Reset</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Left: kameral tree */}
        <div className="rounded-xl border border-ink-line bg-white p-3 max-h-[75vh] overflow-auto">
          {tree.map((ep) => {
            const epOpen = expanded.has(ep.ep) || !!q;
            return (
              <div key={ep.ep}>
                <button onClick={() => toggle(setExpanded, ep.ep)} className="flex w-full items-center gap-2 py-1 text-left font-semibold">
                  <span className="w-3 text-ink-muted">{epOpen ? "▾" : "▸"}</span>
                  <span className="flex-1 truncate">{ep.ep} · {ep.name}</span>
                  <span className="text-xs text-ink-muted tabular-nums">{fmtEurShort(ep.amount)}</span>
                </button>
                {epOpen && ep.glzs.map((g) => {
                  const gOpen = expanded.has(g.glz) || !!q;
                  if (!visible(g.glz, g.label) && !g.posten.some((p) => visible(p.hhst, p.label))) return null;
                  return (
                    <div key={g.glz}>
                      <div className="flex items-center">
                        <button onClick={() => toggle(setExpanded, g.glz)} className="w-3 text-ink-muted shrink-0" style={{ marginLeft: 14 }}>{gOpen ? "▾" : "▸"}</button>
                        <div className="flex-1"><Row id={g.glz} label={g.label} amount={g.amount} depth={1} /></div>
                      </div>
                      {gOpen && g.posten.filter((p) => visible(p.hhst, p.label)).map((p) => (
                        <Row key={p.hhst} id={p.hhst} label={p.label} amount={p.amount} depth={3} />
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Right: theme buckets */}
        <div className="space-y-3 max-h-[75vh] overflow-auto pr-1">
          {Object.entries(themes).map(([tid, t]) => (
            <div key={tid}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) add(id, tid); }}
              onClick={() => { if (selected) add(selected, tid); }}
              className="rounded-xl border-2 bg-white p-3"
              style={{ borderColor: t.color }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block h-3.5 w-3.5 rounded-sm" style={{ background: t.color }} />
                <span className="font-semibold">{t.label}</span>
                <span className="text-xs text-ink-muted">{(byTheme[tid] ?? []).length}</span>
                {selected && <span className="ml-auto text-xs text-ink-muted">Klicken zum Zuordnen ＋</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(byTheme[tid] ?? []).map((id) => (
                  <span key={id} className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs " + (isPosten(id) ? "bg-cream-dark" : "bg-gold-200/50 font-medium")}>
                    <span className="max-w-[16rem] truncate">{labelOf.get(id) ?? id}</span>
                    <button onClick={(e) => { e.stopPropagation(); remove(id, tid); }} className="text-ink-muted hover:text-red-600" aria-label="Entfernen">✕</button>
                  </span>
                ))}
                {!(byTheme[tid] ?? []).length && <span className="text-xs text-ink-muted">Hierher ziehen …</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
  setter((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportJson(assign: Assign) {
  const unterabschnitt: Assign = {}, posten: Assign = {};
  for (const [id, ts] of Object.entries(assign)) (id.includes(".") ? posten : unterabschnitt)[id] = ts;
  download("themen-zuordnung.json", JSON.stringify({ generated: new Date().toISOString(), unterabschnitt, posten }, null, 2), "application/json");
}

function exportYaml(assign: Assign) {
  const lines = ["# Aus dem Zuordnungs-Werkzeug — Unterabschnitts-Ebene (Gliederung).", "# In etl/taxonomy.yaml unter gliederung_overrides einfügen.", "gliederung_overrides:"];
  const glz = Object.entries(assign).filter(([id]) => !id.includes(".")).sort();
  for (const [id, ts] of glz) lines.push(`  "${id}": [${ts.join(", ")}]`);
  const posten = Object.entries(assign).filter(([id]) => id.includes("."));
  if (posten.length) { lines.push("", "# Einzelposten-Ebene (braucht separaten Apply-Schritt):"); for (const [id, ts] of posten) lines.push(`#   "${id}": [${ts.join(", ")}]`); }
  download("themen-zuordnung.yaml", lines.join("\n") + "\n", "text/yaml");
}

function importJson(e: React.ChangeEvent<HTMLInputElement>, setAssign: (a: Assign) => void) {
  const file = e.target.files?.[0]; if (!file) return;
  file.text().then((txt) => {
    try {
      const j = JSON.parse(txt);
      const merged: Assign = { ...(j.unterabschnitt ?? {}), ...(j.posten ?? {}) };
      if (Object.keys(merged).length) setAssign(merged);
    } catch { alert("Konnte die Datei nicht lesen."); }
  });
  e.target.value = "";
}
