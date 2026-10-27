import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { NumberTicker } from "./ui/NumberTicker.jsx";
import { useLibrary } from "../hooks/useLibrary.jsx";
import { TYPES, TYPE_LABEL } from "../lib/library.js";
import { cn, TYPE_COLOR } from "../lib/utils.js";

const BLURB = {
  book: "Novels and classics, from Austen to Gibson.",
  manga: "Numbered volumes, read right to left.",
  comic: "Single issues and graphic novels.",
  vinyl: "LPs at 33⅓, sleeve and all.",
  movie: "VHS boxes from the back room.",
};
const SPAN = {
  book: "col-span-2 md:row-span-2 min-h-[260px]",
  manga: "md:col-span-2",
  comic: "md:col-span-2",
  vinyl: "col-span-2",
  movie: "col-span-2",
};

/* Full-bleed color blocks, one per format. Clicking one filters the catalog. */
export function FormatBento({ onPick }) {
  const { items, status } = useLibrary();

  return (
    <section aria-label="Browse by format" className="grid grid-cols-2 md:grid-cols-6 md:grid-rows-2">
      {TYPES.map((type, i) => {
        const all = items.filter(it => it.type === type);
        const onShelf = all.filter(it => it.isAvailable).length;
        return (
          <motion.button
            key={type}
            type="button"
            onClick={() => onPick(type)}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "grain group relative flex min-h-[170px] flex-col justify-between overflow-hidden p-5 text-left transition-[filter] duration-300 hover:brightness-110 md:p-7",
              TYPE_COLOR[type],
              SPAN[type]
            )}
          >
            <span className="flex items-start justify-between">
              <span className="label text-paper/80">{TYPE_LABEL[type]}</span>
              <ArrowUpRight className="h-5 w-5 text-paper/70 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
            </span>
            <span>
              <span className={cn("block font-display font-extrabold leading-none", type === "book" ? "text-[clamp(4rem,10vw,8.5rem)]" : "text-6xl")}>
                {status === "ready" ? <NumberTicker value={all.length} /> : "–"}
              </span>
              <span className="mt-2 block max-w-[30ch] text-[0.95rem] text-bone/80">
                {BLURB[type]} <span className="text-paper">{onShelf} on the shelf.</span>
              </span>
            </span>
          </motion.button>
        );
      })}
    </section>
  );
}
