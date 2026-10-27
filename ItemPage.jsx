import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowLeft, CalendarClock, Check, History, ShoppingBag } from "lucide-react";
import { Button } from "../components/ui/Button.jsx";
import { Cover } from "../components/Cover.jsx";
import { SqlBlock } from "../components/ActivityLog.jsx";
import { useLibrary } from "../hooks/useLibrary.jsx";
import { CREATOR_LABEL, LOAN_DAYS, TYPE_LABEL, TYPE_SINGULAR } from "../lib/library.js";
import { cn, formatDate, TYPE_COLOR } from "../lib/utils.js";

const ease = [0.22, 1, 0.36, 1];

/* The description page for one item: big cover that tilts toward the pointer,
 * facts, description, borrow / bag / return, its own loan history (with SQL),
 * and more from the same creator and format. */
export function ItemPage({ id }) {
  const { items, status, actions, bag, bagActions, version } = useLibrary();
  const [detail, setDetail] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    actions.itemDetail(id)
      .then(d => { if (!cancelled) { setDetail(d); setMissing(false); } })
      .catch(() => { if (!cancelled) setMissing(true); });
    return () => { cancelled = true; };
  }, [id, status, version, actions]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [id]);

  // 3D tilt
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 150, damping: 18 });

  if (missing) {
    return (
      <Shell>
        <p className="font-display text-4xl font-bold uppercase">That item isn't in the catalog</p>
        <p className="mt-2 text-ash">It may have been removed when the library was reset.</p>
        <Button as="a" href="#catalog" variant="line" className="mt-6">Back to the catalog</Button>
      </Shell>
    );
  }
  if (!detail) {
    return (
      <Shell>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="skeleton aspect-[4/5]" />
          <div className="space-y-4"><div className="skeleton h-4 w-40" /><div className="skeleton h-20 w-3/4" /><div className="skeleton h-32" /></div>
        </div>
      </Shell>
    );
  }

  const { item, loans, sql } = detail;
  const inBag = bag.includes(item.id);
  const out = !item.isAvailable;
  const byCreator = items.filter(i => i.creator === item.creator && i.id !== item.id).slice(0, 6);
  const sameType = items.filter(i => i.type === item.type && i.id !== item.id && i.creator !== item.creator).slice(0, 8);

  return (
    <Shell>
      <a href="#catalog" className="inline-flex items-center gap-2 font-display text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-ash transition-colors hover:text-bone">
        <ArrowLeft className="h-4 w-4" /> Back to the catalog
      </a>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        {/* cover */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease }}
          className="[perspective:1100px]"
          onPointerMove={e => {
            const r = e.currentTarget.getBoundingClientRect();
            mx.set((e.clientX - r.left) / r.width - 0.5);
            my.set((e.clientY - r.top) / r.height - 0.5);
          }}
          onPointerLeave={() => { mx.set(0); my.set(0); }}
        >
          <motion.div style={{ rotateX, rotateY }} className="group border border-bone/10 shadow-2xl shadow-black/60">
            <Cover item={item} tall />
          </motion.div>
          <p className="mt-3 text-center text-sm text-ash">Cover generated for this library edition.</p>
        </motion.div>

        {/* facts */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("px-2.5 py-1 font-display text-[0.75rem] font-semibold uppercase tracking-[0.16em]", TYPE_COLOR[item.type])}>
              {TYPE_SINGULAR[item.type]}
            </span>
            <span className="border border-bone/15 px-2.5 py-1 font-mono text-[0.75rem] text-gold">{item.callNumber}</span>
            {item.year && <span className="border border-bone/15 px-2.5 py-1 font-mono text-[0.75rem]">{item.year}</span>}
          </div>

          <h1 className="mt-5 font-display text-[clamp(3rem,7vw,5.6rem)] font-extrabold uppercase leading-[0.88]">{item.title}</h1>
          <p className="mt-3 font-display text-[1.4rem] font-light uppercase tracking-[0.14em] text-paper">
            <span className="sr-only">{CREATOR_LABEL[item.type]}: </span>{item.creatorLine}
          </p>

          <p className="mt-6 max-w-[58ch] text-[1.15rem] leading-relaxed text-[#cfc8bb]">
            {item.description || `No description yet. This ${TYPE_SINGULAR[item.type].toLowerCase()} was donated to the library; add one when you donate an item.`}
          </p>

          {/* status + actions */}
          <div className="mt-8 border border-bone/10 bg-slate p-5">
            <p className="flex items-center gap-2 font-display text-[0.85rem] font-semibold uppercase tracking-[0.16em]">
              <span className={cn("h-2.5 w-2.5", out ? "bg-wine" : "bg-[#7f9a6a]")} />
              {out ? `On loan · due ${formatDate(item.dueDate)}` : "On the shelf"}
            </p>
            <p className="mt-1 text-sm text-ash">Loans last {LOAN_DAYS} days. Late returns cost $0.25 a day, up to $5.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {out ? (
                <Button onClick={() => actions.giveBack(item.id)}>Return it</Button>
              ) : (
                <>
                  <Button onClick={() => actions.borrow(item.id)}>Borrow now</Button>
                  <Button
                    variant={inBag ? "gold" : "line"}
                    onClick={() => (inBag ? bagActions.remove(item.id) : bagActions.add(item.id, item.title))}
                    aria-pressed={inBag}
                  >
                    {inBag ? <><Check className="h-4 w-4" /> In your bag</> : <><ShoppingBag className="h-4 w-4" /> Add to bag</>}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* loan history */}
          <div className="mt-8">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold uppercase">
              <History className="h-5 w-5 text-gold" /> Loan history
            </h2>
            {loans.length === 0 ? (
              <p className="mt-2 text-ash">Nobody has borrowed this one yet.</p>
            ) : (
              <ol className="mt-3 divide-y divide-bone/10 border-y border-bone/10">
                {loans.map((l, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[0.95rem]">
                    <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-ash" /> Borrowed {formatDate(l.borrowed_at)}</span>
                    <span className={l.returned_at ? "text-ash" : "text-[#e0a4ad]"}>
                      {l.returned_at ? `Returned ${formatDate(l.returned_at)}` : "Still out"}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <p className="label mt-4">The query behind this list</p>
            <SqlBlock sql={sql} className="mt-2" />
          </div>
        </motion.div>
      </div>

      <Shelf title={`More by ${item.creator}`} items={byCreator} />
      <Shelf title={`More ${TYPE_LABEL[item.type].toLowerCase()}`} items={sameType} />
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mx-auto max-w-[1280px] py-10 lg:py-14"
      style={{ paddingLeft: "max(16px, env(safe-area-inset-left))", paddingRight: "max(16px, env(safe-area-inset-right))" }}
    >
      {children}
    </motion.main>
  );
}

function Shelf({ title, items }) {
  if (!items.length) return null;
  return (
    <section className="mt-16">
      <h2 className="font-display text-3xl font-extrabold uppercase">{title}</h2>
      <ul className="mt-5 flex snap-x gap-4 overflow-x-auto pb-4">
        {items.map(it => (
          <li key={it.id} className="w-[200px] shrink-0 snap-start">
            <a href={`#item-${it.id}`} className="group block border border-bone/10 bg-slate transition-colors hover:border-bone/30">
              <Cover item={it} />
              <span className="block px-3 py-2.5">
                <span className="block truncate font-display text-lg font-bold uppercase leading-tight">{it.title}</span>
                <span className="block truncate text-sm text-ash">{it.creatorLine}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
