import { useMemo } from "react";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import { Search, X } from "lucide-react";
import { SegmentedControl } from "./ui/SegmentedControl.jsx";
import { ItemCard, ItemCardSkeleton } from "./ItemCard.jsx";
import { useLibrary } from "../hooks/useLibrary.jsx";
import { TYPES, TYPE_LABEL } from "../lib/library.js";
import { cn } from "../lib/utils.js";

const SORTS = {
  title: { label: "Title A–Z", fn: (a, b) => a.title.localeCompare(b.title) },
  year: { label: "Newest first", fn: (a, b) => (b.year || 0) - (a.year || 0) },
  oldest: { label: "Oldest first", fn: (a, b) => (a.year || 9999) - (b.year || 9999) },
  added: { label: "Recently added", fn: (a, b) => b.id - a.id },
};

/* The catalog: format tabs with a sliding highlight, search, filters,
 * and a grid that animates cards in and out as the filters change. */
export function Catalog({ filter, setFilter, query, setQuery, onlyAvailable, setOnlyAvailable, sort, setSort }) {
  const { items, status } = useLibrary();

  const counts = useMemo(() => {
    const c = { all: items.length };
    TYPES.forEach(t => { c[t] = items.filter(i => i.type === t).length; });
    return c;
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter(it => filter === "all" || it.type === filter)
      .filter(it => !onlyAvailable || it.isAvailable)
      .filter(it => !q || it.title.toLowerCase().includes(q) || it.creator.toLowerCase().includes(q) || String(it.year || "").includes(q))
      .sort(SORTS[sort].fn);
  }, [items, filter, query, onlyAvailable, sort]);

  return (
    <section id="catalog" aria-labelledby="catalog-title" className="mx-auto max-w-[1280px] scroll-mt-20 py-16 lg:py-24"
      style={{ paddingLeft: "max(16px, env(safe-area-inset-left))", paddingRight: "max(16px, env(safe-area-inset-right))" }}>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-bone/10 pb-5">
        <h2 id="catalog-title" className="font-display text-[clamp(2.6rem,6vw,4.4rem)] font-extrabold uppercase leading-none">
          <span className="font-light tracking-[0.1em] text-paper">The</span> Catalog
        </h2>
        <p className="label" aria-live="polite">
          {status === "ready" ? (shown.length === items.length ? `All ${items.length} items` : `${shown.length} of ${items.length} items`) : "Loading"}
        </p>
      </div>

      {/* toolbar */}
      <div className="sticky z-30 -mx-4 mt-6 flex flex-col gap-3 bg-ink/90 px-4 py-3 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between"
        style={{ top: "calc(env(safe-area-inset-top) + 4rem)" }}>
        <LayoutGroup id="format-tabs">
          <SegmentedControl
            id="format"
            className="lg:shrink-0"
            label="Show format"
            value={filter}
            onChange={setFilter}
            options={[{ value: "all", label: "All", count: counts.all }, ...TYPES.map(t => ({ value: t, label: TYPE_LABEL[t], count: counts[t] }))]}
          />
        </LayoutGroup>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          <label className="relative flex min-w-[200px] flex-1 items-center">
            <span className="sr-only">Search by title, creator or year</span>
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-ash" aria-hidden />
            <input
              id="catalog-search"
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Title, creator or year"
              className="h-11 w-full border border-bone/15 bg-slate pl-9 pr-9 text-bone placeholder:text-ash/80 focus:border-gold focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="absolute right-2 p-1 text-ash hover:text-bone" aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          <label className="flex h-11 items-center gap-2 border border-bone/15 px-3 font-display text-[0.75rem] font-semibold uppercase tracking-[0.14em]">
            <input
              id="only-available"
              type="checkbox"
              checked={onlyAvailable}
              onChange={e => setOnlyAvailable(e.target.checked)}
              className="h-4 w-4 accent-[#c9a865]"
            />
            On the shelf
          </label>
          <label className="flex h-11 items-center border border-bone/15">
            <span className="sr-only">Sort</span>
            <select
              id="catalog-sort"
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="h-full bg-slate px-3 font-display text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-bone focus:outline-none"
            >
              {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <ul className={cn("mt-8 grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]")}>
        {status !== "ready"
          ? Array.from({ length: 8 }, (_, i) => <ItemCardSkeleton key={i} />)
          : (
            <AnimatePresence mode="popLayout">
              {shown.map((item, i) => <ItemCard key={item.id} item={item} index={i} />)}
            </AnimatePresence>
          )}
      </ul>

      {status === "ready" && shown.length === 0 && (
        <div className="mt-6 border border-dashed border-bone/20 p-10 text-center">
          <p className="font-display text-2xl font-bold uppercase">Nothing matches that</p>
          <p className="mt-2 text-ash">Try another word or format, or donate it below.</p>
        </div>
      )}
      {status === "error" && (
        <p className="mt-6 border border-wine p-6">The catalog could not load. Check your connection and refresh the page.</p>
      )}
    </section>
  );
}
