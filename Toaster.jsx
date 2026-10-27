import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils.js";

const TONE = {
  success: { icon: Check, bar: "bg-moss" },
  error: { icon: AlertTriangle, bar: "bg-wine" },
  info: { icon: Info, bar: "bg-ochre" },
};

/* Stacked notifications, bottom right. */
export function Toaster({ toasts, onDismiss }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-0 right-0 z-[60] flex w-full max-w-sm flex-col gap-2 p-4"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))", paddingRight: "max(1rem, env(safe-area-inset-right))" }}
    >
      <AnimatePresence initial={false}>
        {toasts.map(t => {
          const { icon: Icon, bar } = TONE[t.tone] || TONE.info;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="pointer-events-auto relative flex items-start gap-3 overflow-hidden border border-bone/15 bg-slate2 py-3 pl-4 pr-10 shadow-2xl shadow-black/50"
            >
              <span className={cn("absolute inset-y-0 left-0 w-1", bar)} />
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-paper" aria-hidden />
              <p className="text-[0.95rem] leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                className="absolute right-2 top-2 p-1 text-ash transition-colors hover:text-bone"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
