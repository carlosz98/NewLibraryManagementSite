import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/* A side drawer (shadcn "Sheet"): slides in from the right over a dimmed page.
 * Closes on Esc or backdrop click, and returns focus where it came from. */
export function Sheet({ open, onClose, title, children, footer }) {
  const panel = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => panel.current?.focus(), 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-bone/15 bg-coal outline-none"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <header className="flex items-center justify-between border-b border-bone/10 px-6 py-5">
              <h2 className="font-display text-3xl font-bold uppercase">{title}</h2>
              <button type="button" onClick={onClose} className="p-2 text-ash transition-colors hover:text-bone" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <footer className="border-t border-bone/10 px-6 py-5">{footer}</footer>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
