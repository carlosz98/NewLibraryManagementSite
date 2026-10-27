import { motion } from "framer-motion";
import { ShoppingBag, Check } from "lucide-react";
import { Cover } from "./Cover.jsx";
import { SpotlightCard } from "./ui/SpotlightCard.jsx";
import { useLibrary } from "../hooks/useLibrary.jsx";
import { TYPE_SINGULAR } from "../lib/library.js";
import { cn, formatDate } from "../lib/utils.js";

/* One catalog card. Clicking the card opens the item's page;
 * the buttons borrow / return or add to the bag without leaving. */
export function ItemCard({ item, index = 0 }) {
  const { bag, bagActions, actions, justBorrowed } = useLibrary();
  const inBag = bag.includes(item.id);
  const out = !item.isAvailable;
  const fresh = justBorrowed.has(item.id);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
      transition={{ duration: 0.5, delay: Math.min(index, 12) * 0.035, ease: [0.22, 1, 0.36, 1] }}
      className="list-none"
    >
      <SpotlightCard className="flex h-full flex-col border border-bone/10 bg-slate transition-colors duration-200 hover:border-bone/25">
        <a href={`#item-${item.id}`} className="flex flex-1 flex-col" aria-label={`${item.title}, ${item.creatorLine}. Open details`}>
          <div className="relative">
            <Cover item={item} />
            <span className="absolute left-3 top-3 z-20 bg-ink/80 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-paper">
              {TYPE_SINGULAR[item.type]}
            </span>
            {out && (
              <motion.span
                initial={fresh ? { scale: 2, opacity: 0, rotate: -20 } : false}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 18 }}
                className="absolute right-3 top-3 z-20 bg-oxblood px-2.5 py-1.5 text-right font-mono text-[0.68rem] leading-tight text-bone shadow-lg shadow-black/40"
              >
                <span className="block font-display text-[0.6rem] uppercase tracking-[0.2em] text-paper">Due</span>
                {formatDate(item.dueDate)}
              </motion.span>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1 px-4 pb-3 pt-4">
            <span className="font-mono text-[0.7rem] tracking-wider text-gold">{item.callNumber}</span>
            <h3 className="font-display text-[1.6rem] font-bold uppercase leading-[0.95]">{item.title}</h3>
            <p className="text-[0.95rem] text-ash">
              {item.creatorLine}
              {item.year ? <span className="text-ash/70"> · {item.year}</span> : null}
            </p>
          </div>
        </a>

        <div className="relative z-20 flex items-center justify-between gap-2 border-t border-bone/10 px-4 py-3">
          <span className="flex items-center gap-2 font-display text-[0.72rem] font-semibold uppercase tracking-[0.16em]">
            <span className={cn("h-2 w-2", out ? "bg-wine" : "bg-[#7f9a6a]")} />
            {out ? "On loan" : "On the shelf"}
          </span>
          <div className="flex gap-2">
            {out ? (
              <button
                type="button"
                onClick={() => actions.giveBack(item.id)}
                className="border border-bone/60 px-3 py-2 font-display text-[0.72rem] font-semibold uppercase tracking-[0.14em] transition-colors duration-200 hover:bg-bone/10"
              >
                Return
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => (inBag ? bagActions.remove(item.id) : bagActions.add(item.id, item.title))}
                  aria-pressed={inBag}
                  aria-label={inBag ? `Remove ${item.title} from your bag` : `Add ${item.title} to your bag`}
                  className={cn(
                    "grid h-9 w-9 place-items-center border transition-colors duration-200",
                    inBag ? "border-gold bg-gold text-ink" : "border-bone/40 text-bone hover:bg-bone/10"
                  )}
                >
                  {inBag ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => actions.borrow(item.id)}
                  className="bg-bone px-3 py-2 font-display text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink transition-colors duration-200 hover:bg-white"
                >
                  Borrow
                </button>
              </>
            )}
          </div>
        </div>
      </SpotlightCard>
    </motion.li>
  );
}

export function ItemCardSkeleton() {
  return (
    <li className="list-none border border-bone/10 bg-slate">
      <div className="skeleton aspect-[5/4]" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-6 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
      </div>
    </li>
  );
}
