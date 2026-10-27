import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Trash2, AlertTriangle } from "lucide-react";
import { Sheet } from "./ui/Sheet.jsx";
import { Button } from "./ui/Button.jsx";
import { Cover } from "./Cover.jsx";
import { useLibrary } from "../hooks/useLibrary.jsx";
import { MAX_PER_CHECKOUT, LOAN_DAYS } from "../lib/library.js";
import { go } from "../hooks/useRoute.js";

/* The bag: items you plan to borrow together. */
export function BagSheet() {
  const { bag, bagOpen, bagActions, items } = useLibrary();
  const inBag = bag.map(id => items.find(i => i.id === id)).filter(Boolean);
  const unavailable = inBag.filter(i => !i.isAvailable);

  return (
    <Sheet
      open={bagOpen}
      onClose={bagActions.close}
      title="Your bag"
      footer={
        inBag.length > 0 && (
          <div className="grid gap-3">
            <p className="text-sm text-ash">
              {inBag.length} of {MAX_PER_CHECKOUT} items. Each loan lasts {LOAN_DAYS} days. Pick up for free, or have them delivered.
            </p>
            <Button
              size="lg"
              className="w-full justify-center"
              disabled={inBag.length === unavailable.length}
              onClick={() => { bagActions.close(); go("checkout"); }}
            >
              Check out {inBag.length - unavailable.length} item{inBag.length - unavailable.length === 1 ? "" : "s"}
            </Button>
          </div>
        )
      }
    >
      {inBag.length === 0 ? (
        <div className="grid place-items-center gap-4 py-16 text-center">
          <ShoppingBag className="h-10 w-10 text-ash" />
          <p className="font-display text-2xl font-bold uppercase">Your bag is empty</p>
          <p className="max-w-[30ch] text-ash">Use the bag button on any item to collect up to {MAX_PER_CHECKOUT}, then check them out together.</p>
          <Button variant="line" onClick={() => { bagActions.close(); go("catalog"); }}>Browse the catalog</Button>
        </div>
      ) : (
        <ul className="grid gap-3">
          <AnimatePresence initial={false}>
            {inBag.map(item => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 60, height: 0 }}
                className="grid grid-cols-[96px_1fr_auto] items-center gap-4 border border-bone/10 bg-slate p-2 pr-3"
              >
                <a href={`#item-${item.id}`} onClick={bagActions.close} className="group block"><Cover item={item} /></a>
                <div className="min-w-0">
                  <p className="truncate font-display text-xl font-bold uppercase leading-tight">{item.title}</p>
                  <p className="truncate text-sm text-ash">{item.creatorLine}</p>
                  {!item.isAvailable && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-[#e0a4ad]">
                      <AlertTriangle className="h-3.5 w-3.5" /> On loan right now
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => bagActions.remove(item.id)}
                  className="p-2 text-ash transition-colors hover:text-bone"
                  aria-label={`Remove ${item.title} from your bag`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Sheet>
  );
}
