import { useEffect, useMemo, useRef, useState } from "react";
import { useData, latestYear, type Data } from "@/lib/data";
import { usePageTitle } from "@/lib/title";
import { Loading } from "@/components/ui";
import { fmtEurShort } from "@/lib/format";

// Internes Arbeitswerkzeug zur thematischen Zuordnung. Temporär, unverlinkt.
// Zustand bleibt lokal (localStorage); Übernahme nur per Export. Start leer.

const LS_KEY = "zuordnung-v2";

type Assign = Record<string, string[]>; // itemId (glz oder hhst) -> theme-ids
type View = "ua" | "posten";
const isPosten = (id: string) => id.includes(".");

interface PostenNode { hhst: string; grz: string; label: string; amount: number }
interface GlzNode { glz: string; label: string; amount: number; posten: PostenNode[] }
interface EpNode { ep: string; name: string; amount: number; glzs: GlzNode[] }

interface Meta { chip: string; amount: number; isPosten: boolean; postenCount: number }

function build(data: Data) {
  const y = latestYear(data.budget);
  const amt = new Map<string, number>();
  for (const f of data.budget.facts) if (f.year === y && f.ansatz != null) amt.set(f.hhst_id, Math.abs(f.ansatz));

  const eps = new Map<string, EpNode>();
  const glzMap = new Map<string, GlzNode>();
  const meta = new Map<string, Meta>();

  for (const p of Object.values(data.budget.posten)) {
    const a = amt.get(p.hhst_id) ?? 0;
    let ep = eps.get(p.einzelplan);
    if (!ep) { ep = { ep: p.einzelplan, name: p.einzelplan_name, amount: 0, glzs: [] }; eps.set(p.einzelplan, ep); }
    let g = glzMap.get(p.glz);
    if (!g) {
      g = { glz: p.glz, label: (p.glz_text ?? p.glz).replace(/\s+/g, " ").trim(), amount: 0, posten: [] };
      glzMap.set(p.glz, g);
      ep.glzs.push(g);
    }
    const grz = p.grz;
    const label = (p.grz_text ?? grz).replace(/\s+/g, " ").trim();
    g.posten.push({ hhst: p.hhst_id, grz, label, amount: a });
    meta.set(p.hhst_id, { chip: `${grz} ${label}`, amount: a, isPosten: true, postenCount: 0 });
    g.amount += a;
    ep.amount += a;
  }
  // kameral order: by number everywhere
  const tree = [...eps.values()].sort((a, b) => a.ep.localeCompare(b.ep));
  for (const ep of tree) {
    ep.glzs.sort((a, b) => a.glz.localeCompare(b.glz));
    for (const g of ep.glzs) {
      g.posten.sort((a, b) => a.grz.localeCompare(b.grz));
      meta.set(g.glz, { chip: `${g.glz} ${g.label}`, amount: g.amount, isPosten: false, postenCount: g.posten.length });
    }
  }
  return { tree, meta };
}

export default function Zuordnung() {
  usePageTitle("Themen-Zuordnung (intern)");
  const { data, error } = useData();
  const [assign, setAssign] = useState<Assign>({});
  const [view, setView] = useState<View>("ua");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [overTheme, setOverTheme] = useState<string | null>(null);
  const loaded = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { tree, meta } = useMemo(() => (data ? build(data) : { tree: [] as EpNode[], meta: new Map<string, Meta>() }), [data]);
  const themes = data?.themes.themes ?? {};

  useEffect(() => {
    if (!data || loaded.current) return;
    loaded.current = true;
    try { const raw = localStorage.getItem(LS_KEY); if (raw) setAssign(JSON.parse(raw)); } catch { /* ignore */ }
  }, [data]);
  useEffect(() => { if (loaded.current) try { localStorage.setItem(LS_KEY, JSON.stringify(assign)); } catch { /* ignore */ } }, [assign]);

  const add = (id: string, theme: string) => setAssign((a) => { const s = new Set(a[id] ?? []); s.add(theme); return { ...a, [id]: [...s] }; });
  const remove = (id: string, theme: string) => setAssign((a) => {
    const cur = (a[id] ?? []).filter((t) => t !== theme); const n = { ...a }; if (cur.length) n[id] = cur; else delete n[id]; return n;
  });

  const byTheme = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const [id, ts] of Object.entries(assign)) for (const t of ts) (m[t] ??= []).push(id);
    for (const t of Object.keys(m)) m[t].sort((a, b) => (meta.get(b)?.amount ?? 0) - (meta.get(a)?.amount ?? 0));
    return m;
  }, [assign, meta]);

  const q = query.trim().toLowerCase();
  const hit = (id: string, label: string) => id.toLowerCase().includes(q) || label.toLowerCase().includes(q);
  const show = (id: string, label: string) => (!q || hit(id, label)) && (!onlyOpen || !(assign[id]?.length));

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!data) return <Loading />;

  const assignedGlz = Object.keys(assign).filter((id) => !isPosten(id)).length;
  const assignedPosten = Object.keys(assign).filter(isPosten).length;

  const startDrag = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "copy";
    const ghost = document.createElement("div");
    ghost.textContent = meta.get(id)?.chip ?? id;
    ghost.style.cssText = "position:absolute;top:-1000px;left:-1000px;max-width:280px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding:4px 10px;border-radius:9999px;background:#1c1c1c;color:#faf7f2;font:600 12px Inter,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25)";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 12, 12);
    setTimeout(() => ghost.remove(), 0);
  };

  const dot = (theme: string, hollow = false) => (
    <span key={theme} title={(themes[theme]?.label ?? theme) + (hollow ? " (vom Unterabschnitt)" : "")}
      className="inline-block h-2.5 w-2.5 rounded-full align-middle"
      style={hollow ? { border: `2px solid ${themes[theme]?.color}` } : { background: themes[theme]?.color }} />
  );

  // one draggable row (Unterabschnitt or Posten)
  const Row = ({ id, code, label, amount, depth, inherited }: { id: string; code: string; label: string; amount: number; depth: number; inherited?: string[] }) => {
    const own = assign[id] ?? [];
    const inh = (inherited ?? []).filter((t) => !own.includes(t));
    return (
      <div draggable onDragStart={(e) => startDrag(e, id)} onDragEnd={() => setOverTheme(null)}
        onClick={() => setSelected((s) => (s === id ? null : id))}
        className={"flex items-center gap-2 rounded px-1.5 py-0.5 cursor-grab active:cursor-grabbing " + (selected === id ? "bg-gold-200/60 ring-1 ring-gold-500" : "hover:bg-cream-dark")}
        style={{ paddingLeft: depth * 14 + 6 }}
        title="Ziehen auf ein Thema — oder anklicken und dann Thema wählen">
        <span className="shrink-0 tabular-nums text-xs text-ink-muted w-14">{code}</span>
        <span className="flex-1 min-w-0 truncate text-sm">{label}</span>
        <span className="flex gap-0.5 shrink-0">{own.map((t) => dot(t))}{inh.map((t) => dot(t, true))}</span>
        <span className="w-16 shrink-0 text-right tabular-nums text-xs text-ink-muted">{amount ? fmtEurShort(amount) : ""}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold">Themen-Zuordnung <span className="text-ink-muted text-base font-normal">(internes Werkzeug)</span></h1>
        <p className="text-sm text-ink-soft max-w-3xl">
          Nach kameraler Nummer geordnet. Unterabschnitte bzw. Einzelposten links auf die Themen-Buckets rechts ziehen
          (oder anklicken, dann Thema wählen). Ein zugeordneter <b>Unterabschnitt</b> gilt implizit für alle Posten darunter
          (○ = geerbt). Mehrfachzuordnung möglich. Änderungen bleiben nur in <b>diesem Browser</b> — mit <b>Export</b> sichern.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="inline-flex rounded-lg border border-ink-line bg-cream p-0.5">
          {([["ua", "Unterabschnitte"], ["posten", "Einzelposten"]] as [View, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} className={"px-3 py-1 rounded-md " + (view === k ? "bg-ink text-cream" : "text-ink-soft")}>{l}</button>
          ))}
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Suchen (Name oder Nummer)…"
          className="rounded-md border border-ink-line bg-white px-3 py-1.5 w-56" />
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> nur unzugeordnete</label>
        <span className="text-ink-muted">{assignedGlz} Unterabschnitte · {assignedPosten} Posten zugeordnet</span>
        <span className="flex-1" />
        <button onClick={() => exportJson(assign)} className="rounded-md bg-ink text-cream px-3 py-1.5">Export JSON</button>
        <button onClick={() => exportYaml(assign)} className="rounded-md border border-ink-line px-3 py-1.5">Export YAML</button>
        <button onClick={() => fileRef.current?.click()} className="rounded-md border border-ink-line px-3 py-1.5">Import</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => importJson(e, setAssign)} />
        <button onClick={() => { if (confirm("Alle Zuordnungen löschen?")) setAssign({}); }} className="rounded-md border border-ink-line px-3 py-1.5 text-red-600">Reset</button>
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
                  <span className="tabular-nums text-xs text-ink-muted w-6">{ep.ep}</span>
                  <span className="flex-1 truncate">{ep.name}</span>
                  <span className="text-xs text-ink-muted tabular-nums">{fmtEurShort(ep.amount)}</span>
                </button>
                {epOpen && ep.glzs.map((g) => {
                  const gAssigned = assign[g.glz] ?? [];
                  if (view === "ua") {
                    return show(g.glz, g.label) ? <Row key={g.glz} id={g.glz} code={g.glz} label={g.label} amount={g.amount} depth={1} /> : null;
                  }
                  // posten view: Unterabschnitt as header, posten draggable with inheritance
                  const visiblePosten = g.posten.filter((p) => show(p.hhst, p.label));
                  if (!visiblePosten.length && !(q && hit(g.glz, g.label))) return null;
                  const gOpen = expanded.has(g.glz) || !!q;
                  return (
                    <div key={g.glz}>
                      <button onClick={() => toggle(setExpanded, g.glz)} className="flex w-full items-center gap-2 py-0.5 text-left" style={{ paddingLeft: 20 }}>
                        <span className="w-3 text-ink-muted">{gOpen ? "▾" : "▸"}</span>
                        <span className="tabular-nums text-xs text-ink-muted w-12">{g.glz}</span>
                        <span className="flex-1 truncate text-sm text-ink-soft">{g.label}</span>
                        <span className="flex gap-0.5">{gAssigned.map((t) => dot(t))}</span>
                      </button>
                      {gOpen && visiblePosten.map((p) => (
                        <Row key={p.hhst} id={p.hhst} code={p.grz} label={p.label} amount={p.amount} depth={3} inherited={gAssigned} />
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
              onDragEnter={(e) => { e.preventDefault(); setOverTheme(tid); }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => setOverTheme((o) => (o === tid ? null : o))}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) add(id, tid); setOverTheme(null); }}
              onClick={() => { if (selected) add(selected, tid); }}
              className={"rounded-xl border-2 bg-white p-3 transition-shadow " + (overTheme === tid ? "shadow-lift ring-2 ring-offset-1" : "")}
              style={{ borderColor: t.color, ...(overTheme === tid ? { background: t.color + "14" } : {}) }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block h-3.5 w-3.5 rounded-sm" style={{ background: t.color }} />
                <span className="font-semibold">{t.label}</span>
                <span className="text-xs text-ink-muted">{(byTheme[tid] ?? []).length}</span>
                {selected && <span className="ml-auto text-xs text-ink-muted">Klicken zum Zuordnen ＋</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(byTheme[tid] ?? []).map((id) => {
                  const m = meta.get(id);
                  return (
                    <span key={id} className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs " + (m?.isPosten ? "bg-cream-dark" : "bg-gold-200/60 font-medium")}>
                      <span className="max-w-[16rem] truncate">{m?.chip ?? id}</span>
                      {!m?.isPosten && m?.postenCount ? <span className="text-ink-muted">·{m.postenCount}P</span> : null}
                      <button onClick={(e) => { e.stopPropagation(); remove(id, tid); }} className="text-ink-muted hover:text-red-600" aria-label="Entfernen">✕</button>
                    </span>
                  );
                })}
                {!(byTheme[tid] ?? []).length && <span className="text-xs text-ink-muted">Hierher ziehen …</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-ink-muted">● direkt zugeordnet · ○ vom Unterabschnitt geerbt · Chip „·NP" = Unterabschnitt mit N Posten.</p>
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
  for (const [id, ts] of Object.entries(assign).filter(([id]) => !id.includes(".")).sort()) lines.push(`  "${id}": [${ts.join(", ")}]`);
  const posten = Object.entries(assign).filter(([id]) => id.includes("."));
  if (posten.length) { lines.push("", "# Einzelposten-Ebene (braucht separaten Apply-Schritt):"); for (const [id, ts] of posten) lines.push(`#   "${id}": [${ts.join(", ")}]`); }
  download("themen-zuordnung.yaml", lines.join("\n") + "\n", "text/yaml");
}
function importJson(e: React.ChangeEvent<HTMLInputElement>, setAssign: (a: Assign) => void) {
  const file = e.target.files?.[0]; if (!file) return;
  file.text().then((txt) => {
    try { const j = JSON.parse(txt); const merged: Assign = { ...(j.unterabschnitt ?? {}), ...(j.posten ?? {}) }; setAssign(merged); }
    catch { alert("Konnte die Datei nicht lesen."); }
  });
  e.target.value = "";
}
