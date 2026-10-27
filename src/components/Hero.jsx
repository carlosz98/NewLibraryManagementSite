import { useRef } from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowDown, ShoppingBag } from "lucide-react";
import { Button } from "./ui/Button.jsx";
import { NumberTicker } from "./ui/NumberTicker.jsx";
import { Cover } from "./Cover.jsx";
import { useLibrary } from "../hooks/useLibrary.jsx";

const ease = [0.22, 1, 0.36, 1];
const rise = {
  hidden: { opacity: 0, y: 28 },
  show: i => ({ opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.08 * i, ease } }),
};

/* Split hero, after the "Make it scream" reference:
 * a quiet editorial panel on the left, a loud color-block panel on the right
 * with a spinning record, three real items from the catalog fanned out,
 * and a huge thin word that drifts as you scroll. */
export function Hero() {
  const { items, status, bagActions } = useLibrary();
  const ref = useRef(null);

  // the big word slides left as the hero scrolls away
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const wordX = useTransform(scrollYProgress, [0, 1], [0, -160]);

  // the fan of covers leans toward the pointer
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 120, damping: 18 });

  const out = items.filter(i => !i.isAvailable).length;
  const pick = type => items.find(i => i.type === type && i.isAvailable) || items.find(i => i.type === type);
  const featured = ["manga", "movie", "vinyl"].map(pick).filter(Boolean);
  const fan = [
    { rotate: -14, x: "-58%", y: "6%", z: 1 },
    { rotate: 0, x: "0%", y: "-4%", z: 3 },
    { rotate: 13, x: "58%", y: "8%", z: 2 },
  ];

  return (
    <section ref={ref} className="grid border-b border-bone/10 lg:grid-cols-[9fr_11fr]" aria-labelledby="hero-title">
      {/* left: editorial */}
      <div
        className="flex flex-col justify-center bg-slate py-14 lg:py-20"
        style={{ paddingLeft: "max(16px, env(safe-area-inset-left), 4vw)", paddingRight: "max(16px, 4vw)" }}
      >
        <motion.p custom={0} variants={rise} initial="hidden" animate="show" className="label">
          Books · Manga · Comics · Vinyl · Film
        </motion.p>
        <h1 id="hero-title" className="mt-5 grid gap-1 font-display uppercase">
          <motion.span custom={1} variants={rise} initial="hidden" animate="show"
            className="text-[clamp(1.2rem,2.4vw,1.8rem)] font-light tracking-[0.16em] text-paper">
            Borrow anything, free:
          </motion.span>
          <motion.span custom={2} variants={rise} initial="hidden" animate="show"
            className="text-[clamp(3.4rem,7.4vw,6.6rem)] font-extrabold leading-[0.86] tracking-[-0.01em]">
            The Library
          </motion.span>
          <motion.span custom={3} variants={rise} initial="hidden" animate="show"
            className="text-[clamp(1.6rem,3.6vw,3rem)] font-light leading-none tracking-[0.2em] text-paper">
            of tomorrow
          </motion.span>
        </h1>
        <motion.p custom={4} variants={rise} initial="hidden" animate="show" className="mt-3 font-sign text-[clamp(2.2rem,4vw,3.2rem)] leading-none text-gold">
          Carlos Zabala
        </motion.p>
        <motion.p custom={5} variants={rise} initial="hidden" animate="show" className="mt-6 max-w-[44ch] text-[1.1rem] text-[#c8c1b4]">
          Books, records, films, manga and comics, two weeks at a time. Put a few in your bag, check out in one go,
          and watch the SQL behind every click.
        </motion.p>
        <motion.div custom={6} variants={rise} initial="hidden" animate="show" className="mt-8 flex flex-wrap gap-3">
          <Button as="a" href="#catalog" size="lg">
            Browse the catalog <ArrowDown className="h-4 w-4" />
          </Button>
          <Button variant="line" size="lg" onClick={bagActions.open}>
            <ShoppingBag className="h-4 w-4" /> Your bag
          </Button>
        </motion.div>

        <motion.dl custom={7} variants={rise} initial="hidden" animate="show" className="mt-12 grid max-w-md grid-cols-3 border-t border-bone/10 pt-5">
          {[
            ["In the collection", items.length],
            ["On the shelves", items.length - out],
            ["Out on loan", out],
          ].map(([label, n]) => (
            <div key={label}>
              <dt className="label text-[0.68rem]">{label}</dt>
              <dd className="mt-1 font-display text-4xl font-bold">
                {status === "ready" ? <NumberTicker value={n} /> : <span className="text-ash">–</span>}
              </dd>
            </div>
          ))}
        </motion.dl>
      </div>

      {/* right: the loud panel */}
      <div
        className="grain relative min-h-[480px] overflow-hidden bg-teal lg:min-h-[640px]"
        onPointerMove={e => {
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width - 0.5);
          my.set((e.clientY - r.top) / r.height - 0.5);
        }}
        onPointerLeave={() => { mx.set(0); my.set(0); }}
      >
        <motion.div aria-hidden className="absolute inset-0 bg-ochre [clip-path:polygon(0_0,58%_0,26%_100%,0_100%)]"
          initial={{ x: "-40%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 1.1, ease }} />
        <motion.div aria-hidden className="absolute inset-0 bg-paper/80 [clip-path:polygon(58%_0,61%_0,29%_100%,26%_100%)]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }} />
        <motion.div aria-hidden className="absolute inset-0 bg-oxblood [clip-path:polygon(100%_62%,100%_100%,62%_100%)]"
          initial={{ x: "30%", y: "30%", opacity: 0 }} animate={{ x: 0, y: 0, opacity: 1 }} transition={{ duration: 1.1, delay: 0.15, ease }} />

        {/* the record */}
        <motion.div
          aria-hidden
          className="absolute left-[18%] top-[6%] aspect-square w-[min(74%,540px)] rounded-full shadow-[-18px_24px_40px_rgba(0,0,0,0.5)]"
          initial={{ scale: 0.6, rotate: -90, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 60, damping: 14, delay: 0.2 }}
        >
          <div className="record-surface grid h-full w-full animate-spin33 place-items-center">
            <div className="grid aspect-square w-[34%] place-items-center rounded-full"
              style={{ background: "radial-gradient(circle, #121216 0 5%, transparent 5.5%), linear-gradient(115deg, #5a1e28 0 50%, #3f2f48 50%)" }}>
              <span className="mt-[46%] font-display text-[0.7rem] font-light uppercase tracking-[0.3em] text-paper">Side A</span>
            </div>
          </div>
        </motion.div>

        {/* real items from the catalog, fanned out */}
        <motion.div
          className="absolute inset-x-0 bottom-[9%] mx-auto flex w-[min(40%,280px)] justify-center"
          style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
        >
          {featured.map((item, i) => (
            <motion.a
              key={item.id}
              href={`#item-${item.id}`}
              aria-label={`${item.title}: open details`}
              className="group absolute bottom-0 w-full border border-black/30 bg-coal shadow-2xl shadow-black/60"
              style={{ zIndex: fan[i].z }}
              initial={{ opacity: 0, y: 80, rotate: 0, x: "0%" }}
              animate={{ opacity: 1, y: fan[i].y, rotate: fan[i].rotate, x: fan[i].x }}
              whileHover={{ y: "-10%", zIndex: 5, transition: { type: "spring", stiffness: 300, damping: 20 } }}
              transition={{ duration: 0.9, delay: 0.5 + i * 0.12, ease }}
            >
              <Cover item={item} tall showLoan={false} />
            </motion.a>
          ))}
        </motion.div>

        <motion.div
          aria-hidden
          style={{ x: wordX }}
          className="pointer-events-none absolute left-[5%] top-[9%] grid whitespace-nowrap font-display text-[clamp(3.2rem,8.4vw,8rem)] font-light uppercase leading-none tracking-[0.12em] text-bone/90"
        >
          <motion.span initial={{ opacity: 0, letterSpacing: "0.5em" }} animate={{ opacity: 1, letterSpacing: "0.12em" }} transition={{ duration: 1.4, delay: 0.3, ease }}>
            Borrow
          </motion.span>
          <motion.span className="pl-[1.4em]" initial={{ opacity: 0, letterSpacing: "0.5em" }} animate={{ opacity: 1, letterSpacing: "0.12em" }} transition={{ duration: 1.4, delay: 0.45, ease }}>
            Today
          </motion.span>
        </motion.div>

        <span className="absolute bottom-[4%] left-[4%] z-10 bg-paper px-2.5 py-1.5 font-mono text-[0.68rem] uppercase tracking-widest text-ink">
          33⅓ rpm · 14 days · free
        </span>
      </div>
    </section>
  );
}
