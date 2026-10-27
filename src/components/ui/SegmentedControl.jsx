import { motion } from "framer-motion";
import { cn } from "../../lib/utils.js";

const TONES = {
  // on dark backgrounds
  dark: { wrap: "border-bone/15", pill: "bg-bone", on: "text-ink", off: "text-bone/80 hover:text-bone", countOn: "text-ink/60", countOff: "text-ash" },
  // on light backgrounds (the ochre donate panel)
  light: { wrap: "border-ink/40", pill: "bg-ink", on: "text-bone", off: "text-ink/75 hover:text-ink", countOn: "text-bone/60", countOff: "text-ink/50" },
};

/* A tab row whose highlight slides between options (framer-motion layoutId).
 * options: [{ value, label, count? }] */
export function SegmentedControl({ options, value, onChange, label, id = "seg", tone = "dark", className }) {
  const t = TONES[tone];
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap border", t.wrap, className)}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative px-3.5 py-2.5 font-display text-[0.8rem] font-semibold uppercase tracking-[0.14em] transition-colors duration-200",
              active ? t.on : t.off
            )}
          >
            {active && (
              <motion.span
                layoutId={`${id}-pill`}
                className={cn("absolute inset-0", t.pill)}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {opt.label}
              {opt.count != null && (
                <span className={cn("font-mono text-[0.68rem] tracking-normal", active ? t.countOn : t.countOff)}>
                  {opt.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
