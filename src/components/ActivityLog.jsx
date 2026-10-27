import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, TerminalSquare } from "lucide-react";
import { Button } from "./ui/Button.jsx";
import { useLibrary } from "../hooks/useLibrary.jsx";
import { formatDateTime, sqlParts } from "../lib/utils.js";

export function SqlBlock({ sql, className = "" }) {
  return (
    <code className={`block whitespace-pre-wrap break-words bg-black/40 px-3 py-2.5 font-mono text-[0.78rem] leading-relaxed text-[#a9a296] ${className}`}>
      {sqlParts(sql).map((p, i) => (p.kw ? <span key={i} className="text-gold">{p.text}</span> : p.text))}
    </code>
  );
}

/* Every action and the SQL it ran. New entries slide in on top. */
export function ActivityLog() {
  const { activity, actions, mode } = useLibrary();
  const [confirm, setConfirm] = useState(false);

  return (
    <div id="activity" className="scroll-mt-24 bg-coal"
      style={{ paddingLeft: "max(16px, 4vw)", paddingRight: "max(16px, env(safe-area-inset-right), 4vw)" }}>
      <div className="max-w-2xl py-16 lg:py-20">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-[clamp(2.4rem,5vw,3.4rem)] font-extrabold uppercase leading-none">
            <span className="font-light tracking-[0.1em] text-paper">Live</span> activity
          </h2>
          {!confirm && (
            <button type="button" onClick={() => setConfirm(true)} className="flex items-center gap-1.5 text-sm text-ash underline underline-offset-4 hover:text-bone">
              <RotateCcw className="h-3.5 w-3.5" /> Reset library
            </button>
          )}
        </div>
        <p className="mt-3 flex items-center gap-2 text-ash">
          <TerminalSquare className="h-4 w-4" /> Every borrow, return, donation and order, with the SQL it ran. Data: {mode || "…"}
        </p>

        <AnimatePresence>
          {confirm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex flex-wrap items-center gap-3 border border-bone/15 bg-slate p-4">
                <p className="w-full">Put back the starting collection and clear donations, loans, orders and this log?</p>
                <Button variant="danger" size="sm" onClick={async () => { setConfirm(false); await actions.reset(); }}>Reset library</Button>
                <button type="button" onClick={() => setConfirm(false)} className="text-sm underline underline-offset-4">Keep everything</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ol className="mt-6 max-h-[560px] overflow-y-auto border-t border-bone/10">
          <AnimatePresence initial={false}>
            {activity.map(a => (
              <motion.li
                key={a.id ?? a.created_at + a.message}
                layout
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="grid gap-1.5 border-b border-bone/10 py-4"
              >
                <p className="font-semibold">{a.message}</p>
                <time className="font-mono text-[0.72rem] text-gold" dateTime={String(a.created_at).replace(" ", "T") + "Z"}>
                  {formatDateTime(a.created_at)}
                </time>
                <SqlBlock sql={a.sql_text} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </div>
    </div>
  );
}
