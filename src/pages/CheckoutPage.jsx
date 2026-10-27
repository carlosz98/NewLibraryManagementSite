import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, PackageCheck, Store, Truck, Loader2 } from "lucide-react";
import { Button } from "../components/ui/Button.jsx";
import { Cover } from "../components/Cover.jsx";
import { PaymentForm } from "../components/PaymentForm.jsx";
import { useLibrary } from "../hooks/useLibrary.jsx";
import { DELIVERY_FEE_CENTS, LOAN_DAYS, money } from "../lib/library.js";
import { cn, formatDate } from "../lib/utils.js";

const STEPS = ["Bag", "Delivery", "Payment", "Done"];

/* Checkout: review the bag, choose pickup or delivery, pay (demo) if there's
 * a delivery fee, and get a receipt. Everything is borrowed in one SQL transaction. */
export function CheckoutPage() {
  const { bag, items, actions, bagActions } = useLibrary();
  const [step, setStep] = useState(0);
  const [delivery, setDelivery] = useState("pickup");
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const ready = useMemo(() => bag.map(id => items.find(i => i.id === id)).filter(i => i && i.isAvailable), [bag, items]);
  const total = delivery === "delivery" ? ready.length * DELIVERY_FEE_CENTS : 0;

  async function place(cardNumber = "") {
    setError("");
    setBusy(true);
    try {
      const r = await actions.checkout({ ids: ready.map(i => i.id), delivery, cardNumber });
      setReceipt(r);
      setStep(3);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  }

  if (step < 3 && ready.length === 0 && !receipt && !busy) {
    return (
      <Page>
        <h1 className="font-display text-5xl font-extrabold uppercase">Checkout</h1>
        <p className="mt-4 max-w-[48ch] text-ash">
          {bag.length ? "Everything in your bag is on loan right now." : "Your bag is empty."} Add items from the catalog with the bag button, then come back here.
        </p>
        <Button as="a" href="#catalog" variant="line" className="mt-6"><ArrowLeft className="h-4 w-4" /> Back to the catalog</Button>
      </Page>
    );
  }

  const visibleSteps = delivery === "delivery" ? STEPS : STEPS.filter(s => s !== "Payment");
  const current = step === 3 ? "Done" : STEPS[step];

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[clamp(2.8rem,6vw,4.4rem)] font-extrabold uppercase leading-none">
          <span className="font-light tracking-[0.1em] text-paper">Check</span>out
        </h1>
        {/* progress */}
        <ol className="flex items-center gap-2" aria-label="Checkout steps">
          {visibleSteps.map((s, i) => {
            const idx = visibleSteps.indexOf(current);
            const done = i < idx;
            const on = s === current;
            return (
              <li key={s} className="flex items-center gap-2">
                <span className={cn(
                  "grid h-7 w-7 place-items-center font-mono text-xs transition-colors",
                  on ? "bg-bone text-ink" : done ? "bg-moss text-bone" : "border border-bone/20 text-ash"
                )} aria-current={on ? "step" : undefined}>
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={cn("hidden font-display text-[0.75rem] font-semibold uppercase tracking-[0.16em] sm:inline", on ? "text-bone" : "text-ash")}>{s}</span>
                {i < visibleSteps.length - 1 && <span className="h-px w-5 bg-bone/20" />}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
        <div>
          {/* each step slides in; enter-only, so nothing can hold a step change up */}
          <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
            >
              {step === 0 && (
                <section aria-label="Review your bag">
                  <h2 className="font-display text-2xl font-bold uppercase">Your bag</h2>
                  <ul className="mt-4 grid gap-3">
                    {ready.map(item => (
                      <li key={item.id} className="grid grid-cols-[110px_1fr_auto] items-center gap-4 border border-bone/10 bg-slate p-2 pr-4">
                        <div className="group"><Cover item={item} /></div>
                        <div className="min-w-0">
                          <p className="truncate font-display text-xl font-bold uppercase">{item.title}</p>
                          <p className="truncate text-sm text-ash">{item.creatorLine}</p>
                        </div>
                        <button type="button" onClick={() => bagActions.remove(item.id)} className="text-sm text-ash underline underline-offset-4 hover:text-bone">Remove</button>
                      </li>
                    ))}
                  </ul>
                  <Button size="lg" className="mt-6" onClick={() => setStep(1)}>Choose delivery <ArrowRight className="h-4 w-4" /></Button>
                </section>
              )}

              {step === 1 && (
                <section aria-label="Delivery">
                  <h2 className="font-display text-2xl font-bold uppercase">How do you want them?</h2>
                  <fieldset className="mt-4 grid gap-3 sm:grid-cols-2">
                    <legend className="sr-only">Delivery</legend>
                    {[
                      { v: "pickup", icon: Store, t: "Pick up at the desk", d: "Ready in an hour at the circulation desk.", p: "Free" },
                      { v: "delivery", icon: Truck, t: "Home delivery", d: "Brought to the address on your library card.", p: `${money(DELIVERY_FEE_CENTS)} per item` },
                    ].map(o => (
                      <label key={o.v} className={cn(
                        "relative flex cursor-pointer flex-col gap-2 border p-5 transition-colors",
                        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold",
                        delivery === o.v ? "border-gold bg-gold/10" : "border-bone/15 hover:border-bone/40"
                      )}>
                        <input type="radio" name="delivery" value={o.v} checked={delivery === o.v} onChange={() => setDelivery(o.v)} className="sr-only" />
                        <o.icon className="h-6 w-6 text-gold" aria-hidden />
                        <span className="font-display text-xl font-bold uppercase">{o.t}</span>
                        <span className="text-ash">{o.d}</span>
                        <span className="font-mono text-sm">{o.p}</span>
                        {delivery === o.v && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 24 }}
                            className="absolute right-4 top-4 grid h-6 w-6 place-items-center bg-gold text-ink"
                          >
                            <Check className="h-4 w-4" />
                          </motion.span>
                        )}
                      </label>
                    ))}
                  </fieldset>
                  {error && <p role="alert" className="mt-4 border-l-4 border-wine bg-wine/20 px-4 py-3">{error}</p>}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4" /> Back</Button>
                    {delivery === "delivery" ? (
                      <Button size="lg" onClick={() => setStep(2)}>Continue to payment <ArrowRight className="h-4 w-4" /></Button>
                    ) : (
                      <Button size="lg" disabled={busy} onClick={() => place().catch(() => {})}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />} Check out {ready.length} item{ready.length === 1 ? "" : "s"}
                      </Button>
                    )}
                  </div>
                </section>
              )}

              {step === 2 && (
                <section aria-label="Payment">
                  <h2 className="mb-4 font-display text-2xl font-bold uppercase">Payment</h2>
                  <PaymentForm amountCents={total} onPay={place} submitLabel="Pay" />
                  <Button variant="ghost" className="mt-4" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
                </section>
              )}

              {step === 3 && receipt && <Receipt receipt={receipt} />}
          </motion.div>
        </div>

        {/* summary */}
        {step < 3 && (
          <aside className="h-fit border border-bone/10 bg-slate p-6 lg:sticky lg:top-24">
            <h2 className="font-display text-2xl font-bold uppercase">Summary</h2>
            <dl className="mt-4 grid gap-2 text-[0.95rem]">
              <Row k={`${ready.length} item${ready.length === 1 ? "" : "s"}, ${LOAN_DAYS}-day loan`} v="Free" />
              <Row k={delivery === "delivery" ? "Home delivery" : "Pickup at the desk"} v={delivery === "delivery" ? money(total) : "Free"} />
              <div className="my-2 h-px bg-bone/10" />
              <Row k={<b>Total</b>} v={<b className="font-mono text-lg">{money(total)}</b>} />
            </dl>
            <p className="mt-4 text-sm text-ash">Due back {formatDate(new Date(Date.now() + LOAN_DAYS * 86400000))}.</p>
          </aside>
        )}
      </div>
    </Page>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ash">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function Receipt({ receipt }) {
  const burst = Array.from({ length: 14 }, (_, i) => i);
  return (
    <section aria-label="Order complete" className="relative overflow-hidden border border-bone/10 bg-slate p-8">
      {/* a little burst of color blocks */}
      {burst.map(i => (
        <motion.span
          key={i}
          aria-hidden
          className={cn("absolute left-12 top-14 h-3 w-3", ["bg-ochre", "bg-wine", "bg-teal", "bg-plum", "bg-moss", "bg-gold", "bg-rust"][i % 7])}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: Math.cos((i / 14) * Math.PI * 2) * 120, y: Math.sin((i / 14) * Math.PI * 2) * 90, opacity: 0, rotate: 180 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      ))}
      <motion.div
        initial={{ scale: 0, rotate: -40 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="grid h-14 w-14 place-items-center bg-moss"
      >
        <Check className="h-7 w-7" />
      </motion.div>
      <h2 className="mt-6 font-display text-4xl font-extrabold uppercase">You're all set</h2>
      <p className="mt-2 text-[1.1rem]">{receipt.message}</p>
      <dl className="mt-6 grid gap-2 font-mono text-sm sm:grid-cols-2">
        <div><dt className="label">Order</dt><dd>#{String(receipt.orderId).padStart(5, "0")}</dd></div>
        <div><dt className="label">Due back</dt><dd>{formatDate(new Date(receipt.dueDate))}</dd></div>
        <div><dt className="label">{receipt.delivery === "delivery" ? "Delivery" : "Pickup"}</dt><dd>{receipt.delivery === "delivery" ? "To your door" : "Circulation desk"}</dd></div>
        <div><dt className="label">Paid</dt><dd>{money(receipt.amountCents)}{receipt.amountCents ? " (demo, card ending 4242)" : ""}</dd></div>
      </dl>
      {receipt.skipped?.length > 0 && <p className="mt-4 text-sm text-[#e0a4ad]">Skipped: {receipt.skipped.join(" ")}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button as="a" href="#profile">See your loans</Button>
        <Button as="a" href="#catalog" variant="line">Keep browsing</Button>
      </div>
    </section>
  );
}

function Page({ children }) {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto min-h-[70vh] max-w-[1180px] py-12 lg:py-16"
      style={{ paddingLeft: "max(16px, env(safe-area-inset-left))", paddingRight: "max(16px, env(safe-area-inset-right))" }}
    >
      {children}
    </motion.main>
  );
}
