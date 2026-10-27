import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import { ShoppingBag, UserRound } from "lucide-react";
import { useLibrary } from "../hooks/useLibrary.jsx";
import { cn } from "../lib/utils.js";

const LINKS = [
  { href: "#catalog", label: "Catalog" },
  { href: "#donate", label: "Donate" },
  { href: "#activity", label: "Activity" },
];

/* Sticky top bar: turns solid once you scroll. Bag count springs when it changes. */
export function Navbar() {
  const { bag, bagActions } = useLibrary();
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, "change", y => setSolid(y > 24));

  return (
    <>
      {/* paints the phone's status-bar area the same color as the bar */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-40 bg-ink" style={{ height: "env(safe-area-inset-top)" }} />
      <header
        className={cn(
          "sticky z-40 border-b transition-colors duration-300",
          solid ? "border-bone/10 bg-ink/90 backdrop-blur-md" : "border-transparent bg-ink"
        )}
        style={{ top: "env(safe-area-inset-top)" }}
      >
        <nav
          aria-label="Main"
          className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4"
          style={{ paddingLeft: "max(16px, env(safe-area-inset-left))", paddingRight: "max(16px, env(safe-area-inset-right))" }}
        >
          <a href="#" className="flex items-center gap-3" aria-label="Library of Tomorrow, home">
            <span className="grid h-9 w-9 place-items-center bg-bone font-display text-lg font-extrabold text-ink">LT</span>
            <span className="hidden font-display text-[0.95rem] font-light uppercase tracking-[0.22em] sm:block">
              Library of <b className="font-bold">Tomorrow</b>
            </span>
          </a>

          <div className="flex items-center gap-1 sm:gap-2">
            <ul className="hidden items-center md:flex">
              {LINKS.map(l => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="px-3 py-2 font-display text-[0.8rem] font-medium uppercase tracking-[0.18em] text-ash transition-colors duration-200 hover:text-bone"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <a
              href="#profile"
              className="grid h-10 w-10 place-items-center text-bone transition-colors duration-200 hover:bg-bone/10"
              aria-label="Your profile"
            >
              <UserRound className="h-5 w-5" />
            </a>
            <button
              type="button"
              onClick={bagActions.open}
              className="relative flex h-10 items-center gap-2 border border-bone/30 px-3 font-display text-[0.8rem] font-semibold uppercase tracking-[0.14em] transition-colors duration-200 hover:bg-bone/10"
              aria-label={`Open your bag, ${bag.length} item${bag.length === 1 ? "" : "s"}`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Bag</span>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={bag.length}
                  initial={{ y: -12, opacity: 0, scale: 0.6 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 12, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className={cn(
                    "grid h-5 min-w-5 place-items-center px-1 font-mono text-[0.7rem]",
                    bag.length ? "bg-gold text-ink" : "bg-bone/15 text-ash"
                  )}
                >
                  {bag.length}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </nav>
      </header>
    </>
  );
}
