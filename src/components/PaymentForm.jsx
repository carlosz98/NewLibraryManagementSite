import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, FlaskConical, Loader2, Lock } from "lucide-react";
import { Button } from "./ui/Button.jsx";
import { DEMO_CARD, checkDemoCard, money } from "../lib/library.js";
import { cn } from "../lib/utils.js";

const groups = digits => digits.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

/* DEMO payment form.
 * Nothing is charged. Only the test card 4242 4242 4242 4242 is accepted,
 * and card numbers are never saved: orders keep the total and the last four digits. */
export function PaymentForm({ amountCents, onPay, submitLabel = "Pay" }) {
  const [card, setCard] = useState({ name: "", number: "", expiry: "", cvc: "" });
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = k => e => {
    let v = e.target.value;
    if (k === "number") v = groups(v);
    if (k === "expiry") v = v.replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");
    if (k === "cvc") v = v.replace(/\D/g, "").slice(0, 4);
    setCard(c => ({ ...c, [k]: v }));
  };

  function fillTestCard() {
    setCard({ name: card.name || "Library Member", number: groups(DEMO_CARD), expiry: "12/30", cvc: "123" });
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    const problem = checkDemoCard(card.number);
    if (!card.name.trim()) return setError("Add the name on the card.");
    if (problem) return setError(problem);
    const [mm, yy] = card.expiry.split("/").map(Number);
    const exp = new Date(2000 + (yy || 0), mm || 0, 1);
    if (!mm || mm > 12 || !yy || exp <= new Date()) return setError("Use an expiry date in the future, like 12/30.");
    if (card.cvc.length < 3) return setError("The security code is the 3 digits on the back.");
    setError("");
    setBusy(true);
    try {
      await onPay(card.number);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const input = "h-12 w-full border border-bone/20 bg-slate px-3 text-bone placeholder:text-ash/70 focus:border-gold focus:outline-none";

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <div role="note" className="flex gap-3 border border-gold/50 bg-gold/10 p-4 text-[0.95rem]">
        <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
        <p>
          <b>Demo payment.</b> Nothing is charged and card numbers are never saved. Only the test card{" "}
          <span className="whitespace-nowrap font-mono">4242 4242 4242 4242</span> works.{" "}
          <button type="button" onClick={fillTestCard} className="font-semibold text-gold underline underline-offset-4">Use the test card</button>
        </p>
      </div>

      {/* the card itself: flips to show the back while you type the security code */}
      <div className="mx-auto w-full max-w-sm [perspective:1000px]">
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 20 }}
          className="relative aspect-[1.586] w-full [transform-style:preserve-3d]"
        >
          <div className="grain absolute inset-0 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-plum via-oxblood to-rust p-5 shadow-2xl shadow-black/60 [backface-visibility:hidden]">
            <div className="flex items-start justify-between">
              <span className="font-display text-sm font-light uppercase tracking-[0.3em] text-paper">Library of Tomorrow</span>
              <span className="bg-paper/90 px-1.5 py-0.5 font-display text-[0.65rem] font-bold uppercase tracking-widest text-ink">Demo</span>
            </div>
            <span className="h-8 w-11 rounded-sm bg-gradient-to-br from-gold to-ochre" />
            <span className="font-mono text-[clamp(1rem,4.6vw,1.35rem)] tracking-[0.12em] text-bone">
              {card.number || "•••• •••• •••• ••••"}
            </span>
            <div className="flex justify-between font-display text-sm uppercase tracking-[0.14em] text-paper">
              <span className="truncate">{card.name || "Your name"}</span>
              <span className="font-mono">{card.expiry || "MM/YY"}</span>
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col justify-center gap-4 bg-gradient-to-br from-rust via-oxblood to-plum shadow-2xl shadow-black/60 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span className="h-10 w-full bg-black/70" />
            <div className="flex items-center gap-3 px-5">
              <span className="h-8 flex-1 bg-paper/80" />
              <span className="bg-bone px-3 py-1.5 font-mono text-ink">{card.cvc || "•••"}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="label">Name on card</span>
          <input id="pay-name" className={input} value={card.name} onChange={set("name")} autoComplete="off" />
        </label>
        <label className="sm:col-span-2">
          <span className="label">Card number</span>
          <span className="relative block">
            <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" aria-hidden />
            <input id="pay-number" className={cn(input, "pl-9 font-mono tracking-wider")} value={card.number} onChange={set("number")}
              inputMode="numeric" placeholder="4242 4242 4242 4242" autoComplete="off" />
          </span>
        </label>
        <label>
          <span className="label">Expiry</span>
          <input id="pay-expiry" className={cn(input, "font-mono")} value={card.expiry} onChange={set("expiry")} inputMode="numeric" placeholder="MM/YY" autoComplete="off" />
        </label>
        <label>
          <span className="label">Security code</span>
          <input id="pay-cvc" className={cn(input, "font-mono")} value={card.cvc} onChange={set("cvc")} inputMode="numeric" placeholder="123"
            autoComplete="off" onFocus={() => setFlipped(true)} onBlur={() => setFlipped(false)} />
        </label>
      </div>

      {error && <p role="alert" className="border-l-4 border-wine bg-wine/20 px-4 py-3">{error}</p>}

      <Button type="submit" size="lg" variant="gold" disabled={busy} className="w-full justify-center">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} {submitLabel} {money(amountCents)}
      </Button>
    </form>
  );
}
