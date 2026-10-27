import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, Plus, Loader2, Check } from "lucide-react";
import { Button } from "./ui/Button.jsx";
import { SegmentedControl } from "./ui/SegmentedControl.jsx";
import { useLibrary } from "../hooks/useLibrary.jsx";
import { CATALOGS, CREATOR_LABEL, TYPES, TYPE_SINGULAR, TYPE_NOUN, searchCatalog } from "../lib/library.js";
import { cn } from "../lib/utils.js";

const field = "h-12 w-full border-0 border-b-2 border-ink bg-transparent px-0 text-lg text-ink placeholder:text-ink/40 focus:border-oxblood focus:outline-none";

/* Donate an item by hand, or find it in a public catalog and add it in one click. */
export function DonatePanel() {
  const [tab, setTab] = useState("form");
  return (
    <div id="donate" className="scroll-mt-24 bg-ochre text-ink"
      style={{ paddingLeft: "max(16px, env(safe-area-inset-left), 4vw)", paddingRight: "max(16px, 4vw)" }}>
      <div className="ml-auto max-w-xl py-16 lg:py-20">
        <h2 className="font-display text-[clamp(2.4rem,5vw,3.4rem)] font-extrabold uppercase leading-none">
          <span className="font-light tracking-[0.1em]">Donate</span> an item
        </h2>
        <p className="mt-3 max-w-[46ch]">Add something to the catalog. It's ready to borrow the moment you add it.</p>
        <div className="mt-6">
          <SegmentedControl
            id="donate-tab"
            label="How to add"
            tone="light"
            value={tab}
            onChange={setTab}
            options={[{ value: "form", label: "Type it in" }, { value: "online", label: "Find it online" }]}
          />
        </div>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "form" ? <DonateForm /> : <FindOnline />}
        </motion.div>
      </div>
    </div>
  );
}

function TypePicker({ value, onChange, name }) {
  return (
    <fieldset className="mt-8">
      <legend className="mb-3 font-display text-[0.8rem] font-semibold uppercase tracking-[0.16em]">Format</legend>
      <div className="flex flex-wrap">
        {TYPES.map(t => (
          <label
            key={t}
            className={cn(
              "-ml-px border border-ink px-4 py-2.5 font-display text-[0.8rem] font-semibold uppercase tracking-[0.14em] transition-colors first:ml-0",
              "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
              value === t ? "bg-ink text-bone" : "hover:bg-ink/10"
            )}
          >
            <input type="radio" name={name} value={t} checked={value === t} onChange={() => onChange(t)} className="sr-only" />
            {TYPE_SINGULAR[t]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function DonateForm() {
  const { actions } = useLibrary();
  const [type, setType] = useState("book");
  const [form, setForm] = useState({ title: "", creator: "", year: "", description: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const missing = [];
    if (!form.title.trim()) missing.push("a title");
    if (!form.creator.trim()) missing.push(`the ${CREATOR_LABEL[type].toLowerCase()}`);
    if (missing.length) { setError(`Add ${missing.join(" and ")} to donate this ${TYPE_NOUN[type]}.`); return; }
    if (form.year && !/^\d{4}$/.test(form.year.trim())) { setError("Use a four-digit year, like 1987."); return; }
    setError("");
    setBusy(true);
    try {
      await actions.donate({ type, title: form.title.trim(), creator: form.creator.trim(), year: form.year.trim() || null, description: form.description.trim() });
      setForm({ title: "", creator: "", year: "", description: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <TypePicker value={type} onChange={setType} name="donate-type" />
      <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_120px]">
        <label className="block">
          <span className="font-display text-[0.8rem] font-semibold uppercase tracking-[0.16em]">Title</span>
          <input id="d-title" className={field} value={form.title} onChange={set("title")} autoComplete="off" aria-invalid={!!error && !form.title.trim()} />
        </label>
        <label className="block">
          <span className="font-display text-[0.8rem] font-semibold uppercase tracking-[0.16em]">Year</span>
          <input id="d-year" className={field} value={form.year} onChange={set("year")} inputMode="numeric" placeholder="1987" maxLength={4} />
        </label>
      </div>
      <label className="mt-5 block">
        <span className="font-display text-[0.8rem] font-semibold uppercase tracking-[0.16em]">{CREATOR_LABEL[type]}</span>
        <input id="d-creator" className={field} value={form.creator} onChange={set("creator")} autoComplete="off" aria-invalid={!!error && !form.creator.trim()} />
      </label>
      <label className="mt-5 block">
        <span className="font-display text-[0.8rem] font-semibold uppercase tracking-[0.16em]">Description <span className="font-normal normal-case tracking-normal text-ink/60">(optional)</span></span>
        <textarea id="d-desc" rows={3} value={form.description} onChange={set("description")} maxLength={1000}
          className="mt-1 w-full border-2 border-ink bg-transparent p-3 text-ink placeholder:text-ink/40 focus:border-oxblood focus:outline-none"
          placeholder="What is it about?" />
      </label>
      {error && <p role="alert" className="mt-4 bg-oxblood px-4 py-3 text-bone">{error}</p>}
      <Button type="submit" size="lg" disabled={busy} className="mt-6 border-ink bg-ink text-bone hover:bg-coal">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Donate to the library
      </Button>
    </form>
  );
}

function FindOnline() {
  const { actions } = useLibrary();
  const [type, setType] = useState("book");
  const [q, setQ] = useState("");
  const [state, setState] = useState({ status: "idle", results: [], message: "" });
  const [added, setAdded] = useState(new Set());
  const source = CATALOGS[type].source;

  async function search(e) {
    e.preventDefault();
    if (!q.trim()) { setState({ status: "idle", results: [], message: "Type a title or name to search." }); return; }
    setState({ status: "loading", results: [], message: `Searching ${source}…` });
    try {
      const results = (await searchCatalog(actions.store(), type, q.trim())).filter(r => r.title);
      setAdded(new Set());
      setState({
        status: "done",
        results,
        message: results.length ? `${results.length} results from ${source}.` : `${source} has nothing for "${q}". Try fewer words.`,
      });
    } catch (err) {
      setState({
        status: "error",
        results: [],
        message: `Couldn't reach ${source}. Online search works on the published site (GitHub Pages or your PHP server), not inside the claude.ai preview.`,
      });
    }
  }

  async function add(r, i) {
    await actions.donate({ type, title: r.title.slice(0, 200), creator: r.creator.slice(0, 200), year: r.year || null, description: "" });
    setAdded(s => new Set(s).add(i));
  }

  return (
    <div>
      <p className="mt-6 max-w-[48ch] text-[0.95rem]">
        Search free public catalogs: <b>Open Library</b> for books, manga and comics, <b>MusicBrainz</b> for albums, <b>Wikidata</b> for films.
      </p>
      <TypePicker value={type} onChange={setType} name="online-type" />
      <form onSubmit={search} role="search" className="mt-6 flex items-end gap-3">
        <label className="flex-1">
          <span className="font-display text-[0.8rem] font-semibold uppercase tracking-[0.16em]">Title or name</span>
          <input id="l-q" type="search" className={field} value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. Kind of Blue" autoComplete="off" />
        </label>
        <Button type="submit" className="border-ink bg-ink text-bone hover:bg-coal">
          {state.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Search
        </Button>
      </form>
      <p aria-live="polite" className="mt-4 min-h-[1.6em] font-medium">{state.message}</p>
      <ul className="mt-2 grid gap-px bg-ink/20">
        <AnimatePresence>
          {state.results.map((r, i) => (
            <motion.li
              key={`${r.title}-${i}`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between gap-3 bg-ink px-4 py-3 text-bone"
            >
              <span className="min-w-0">
                <b className="block truncate font-semibold">{r.title}</b>
                <span className="block truncate text-sm text-ash">{r.creator}{r.year ? ` · ${r.year}` : ""}</span>
              </span>
              <Button size="sm" variant={added.has(i) ? "line" : "solid"} disabled={added.has(i)} onClick={() => add(r, i)}>
                {added.has(i) ? <><Check className="h-3.5 w-3.5" /> Added</> : <><Plus className="h-3.5 w-3.5" /> Add</>}
              </Button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
