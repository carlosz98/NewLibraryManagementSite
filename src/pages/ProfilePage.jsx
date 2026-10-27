import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, BadgeCheck, Pencil, Receipt, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "../components/ui/Button.jsx";
import { NumberTicker } from "../components/ui/NumberTicker.jsx";
import { PaymentForm } from "../components/PaymentForm.jsx";
import { useLibrary } from "../hooks/useLibrary.jsx";
import { daysOverdue, dueFrom, fineCents, money, TYPE_SINGULAR } from "../lib/library.js";
import { cn, formatDate, hashOf, initials } from "../lib/utils.js";

/* Your member profile: library card, current loans, fines, history and orders. */
export function ProfilePage() {
  const { actions, version, status } = useLibrary();
  const [data, setData] = useState(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    actions.profile().then(d => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [actions, version, status]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, []);

  const summary = useMemo(() => {
    if (!data) return null;
    const current = data.loans.filter(l => !l.returned_at);
    const fines = data.loans
      .map(l => ({ ...l, owed: fineCents(l.borrowed_at, l.returned_at, l.fine_paid_cents), late: daysOverdue(l.borrowed_at, l.returned_at) }))
      .filter(l => l.owed > 0);
    return { current, fines, owed: fines.reduce((s, l) => s + l.owed, 0) };
  }, [data]);

  if (!data || !summary) {
    return (
      <Page>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="skeleton aspect-[1.586]" />
          <div className="space-y-3"><div className="skeleton h-10 w-2/3" /><div className="skeleton h-28" /></div>
        </div>
      </Page>
    );
  }

  const { member, loans, orders } = data;

  return (
    <Page>
      <h1 className="font-display text-[clamp(2.8rem,6vw,4.4rem)] font-extrabold uppercase leading-none">
        <span className="font-light tracking-[0.1em] text-paper">Your</span> profile
      </h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="grid h-fit gap-6">
          <LibraryCard member={member} />
          <ProfileForm member={member} />
        </div>

        <div className="grid h-fit gap-10">
          {/* stats */}
          <dl className="grid grid-cols-3 border border-bone/10">
            {[
              ["Out now", summary.current.length, "bg-teal"],
              ["All loans", loans.length, "bg-plum"],
              ["Fines owed", null, summary.owed ? "bg-oxblood" : "bg-moss"],
            ].map(([label, n, bg]) => (
              <div key={label} className={cn("grain relative p-5", bg)}>
                <dt className="label text-paper/80">{label}</dt>
                <dd className="mt-2 font-display text-5xl font-extrabold">
                  {n === null ? money(summary.owed) : <NumberTicker value={n} />}
                </dd>
              </div>
            ))}
          </dl>

          {/* fines */}
          <AnimatePresence initial={false}>
            {summary.owed > 0 && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
                aria-labelledby="fines-title"
              >
                <div className="border border-wine/60 bg-wine/15 p-5">
                  <h2 id="fines-title" className="flex items-center gap-2 font-display text-2xl font-bold uppercase">
                    <AlertTriangle className="h-5 w-5 text-[#e0a4ad]" /> You owe {money(summary.owed)} in fines
                  </h2>
                  <ul className="mt-3 grid gap-1 text-[0.95rem]">
                    {summary.fines.map(f => (
                      <li key={f.id} className="flex justify-between gap-4">
                        <span><a href={`#item-${f.item_id}`} className="underline underline-offset-4">{f.title}</a>, {f.late} day{f.late === 1 ? "" : "s"} late</span>
                        <span className="font-mono">{money(f.owed)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-ash">Fines are $0.25 a day after the due date, up to $5 per loan.</p>
                  {!paying ? (
                    <Button variant="gold" className="mt-4" onClick={() => setPaying(true)}>Pay fines</Button>
                  ) : (
                    <div className="mt-6">
                      <PaymentForm
                        amountCents={summary.owed}
                        submitLabel="Pay fines"
                        onPay={async card => { await actions.payFines({ cardNumber: card }); setPaying(false); }}
                      />
                      <button type="button" onClick={() => setPaying(false)} className="mt-3 text-sm text-ash underline underline-offset-4">Not now</button>
                    </div>
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* current loans */}
          <section aria-labelledby="current-title">
            <h2 id="current-title" className="font-display text-3xl font-extrabold uppercase">Out with you</h2>
            {summary.current.length === 0 ? (
              <p className="mt-3 text-ash">Nothing out right now. <a href="#catalog" className="text-bone underline underline-offset-4">Find something to borrow</a>.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {summary.current.map(l => {
                  const late = daysOverdue(l.borrowed_at, null);
                  return (
                    <motion.li layout key={l.id} className="flex flex-wrap items-center justify-between gap-3 border border-bone/10 bg-slate p-4">
                      <div className="min-w-0">
                        <a href={`#item-${l.item_id}`} className="font-display text-xl font-bold uppercase hover:underline">{l.title}</a>
                        <p className="text-sm text-ash">{TYPE_SINGULAR[l.type]} · borrowed {formatDate(l.borrowed_at)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("px-2.5 py-1 font-mono text-xs", late ? "bg-wine text-bone" : "border border-bone/20")}>
                          {late ? `${late} day${late === 1 ? "" : "s"} late` : `Due ${formatDate(dueFrom(l.borrowed_at))}`}
                        </span>
                        <Button size="sm" variant="line" onClick={() => actions.giveBack(l.item_id)}>
                          <RotateCcw className="h-3.5 w-3.5" /> Return
                        </Button>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* history */}
          <section aria-labelledby="history-title">
            <h2 id="history-title" className="font-display text-3xl font-extrabold uppercase">Loan history</h2>
            <ol className="mt-3 divide-y divide-bone/10 border-y border-bone/10">
              {loans.filter(l => l.returned_at).map(l => (
                <li key={l.id} className="flex flex-wrap justify-between gap-2 py-3 text-[0.95rem]">
                  <a href={`#item-${l.item_id}`} className="font-semibold hover:underline">{l.title}</a>
                  <span className="text-ash">{formatDate(l.borrowed_at)} to {formatDate(l.returned_at)}</span>
                </li>
              ))}
              {loans.filter(l => l.returned_at).length === 0 && <li className="py-3 text-ash">Nothing returned yet.</li>}
            </ol>
          </section>

          {/* orders */}
          <section aria-labelledby="orders-title">
            <h2 id="orders-title" className="flex items-center gap-2 font-display text-3xl font-extrabold uppercase">
              <Receipt className="h-6 w-6 text-gold" /> Orders
            </h2>
            {orders.length === 0 ? (
              <p className="mt-3 text-ash">No orders yet. Checkouts from your bag and fine payments show up here.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-[0.95rem]">
                  <thead className="label text-[0.7rem]">
                    <tr className="border-b border-bone/10">
                      <th className="py-2 font-medium">Order</th><th className="font-medium">What</th><th className="font-medium">Date</th><th className="text-right font-medium">Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bone/10">
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td className="py-2.5 font-mono">#{String(o.id).padStart(5, "0")}</td>
                        <td>{o.kind === "fines" ? `Fines (${o.item_count} loan${o.item_count === 1 ? "" : "s"})` : `${o.item_count} item${o.item_count === 1 ? "" : "s"}, ${o.delivery === "delivery" ? "delivered" : "pickup"}`}</td>
                        <td className="text-ash">{formatDate(o.created_at)}</td>
                        <td className="text-right font-mono">{money(Number(o.amount_cents))}{o.card_last4 ? <span className="text-ash"> ·{o.card_last4}</span> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </Page>
  );
}

/* The member card: tap to flip it over. The barcode is drawn from the card number. */
function LibraryCard({ member }) {
  const [flipped, setFlipped] = useState(false);
  const bars = useMemo(() => {
    let h = hashOf(member.card_number);
    return Array.from({ length: 42 }, () => { h = (h * 1103515245 + 12345) >>> 0; return 1 + (h % 3); });
  }, [member.card_number]);

  return (
    <button
      type="button"
      onClick={() => setFlipped(f => !f)}
      aria-label={`Library card for ${member.name}, number ${member.card_number}. ${flipped ? "Show the front" : "Show the back"}`}
      className="block w-full text-left [perspective:1200px]"
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 140, damping: 18 }}
        className="relative aspect-[1.586] w-full [transform-style:preserve-3d]"
      >
        {/* front */}
        <div className="grain absolute inset-0 overflow-hidden bg-teal p-6 shadow-2xl shadow-black/60 [backface-visibility:hidden]">
          <div aria-hidden className="absolute inset-0 bg-ochre [clip-path:polygon(0_0,46%_0,22%_100%,0_100%)]" />
          <div aria-hidden className="absolute inset-0 bg-paper/80 [clip-path:polygon(46%_0,48.5%_0,24.5%_100%,22%_100%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center bg-bone font-display text-xl font-extrabold text-ink">LT</span>
              <span className="text-right font-display text-xs font-light uppercase tracking-[0.3em] text-bone">Library of<br /><b className="font-bold">Tomorrow</b></span>
            </div>
            <div>
              <span className="label text-paper/90">Member</span>
              <p className="font-display text-[clamp(1.8rem,4vw,2.4rem)] font-extrabold uppercase leading-none">{member.name}</p>
              <p className="mt-2 font-mono text-sm tracking-[0.18em] text-bone/90">{member.card_number}</p>
            </div>
          </div>
        </div>
        {/* back */}
        <div className="absolute inset-0 flex flex-col justify-between bg-paper p-6 text-ink shadow-2xl shadow-black/60 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="flex h-16 items-end gap-[2px]" aria-hidden>
            {bars.map((w, i) => <span key={i} className="h-full bg-ink" style={{ width: w * 2 }} />)}
          </div>
          <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div><dt className="opacity-60">CARD</dt><dd>{member.card_number}</dd></div>
            <div><dt className="opacity-60">SINCE</dt><dd>{formatDate(member.joined_at)}</dd></div>
            <div className="col-span-2"><dt className="opacity-60">EMAIL</dt><dd className="truncate">{member.email || "not set"}</dd></div>
          </dl>
          <p className="text-xs">If found, please return to the circulation desk.</p>
        </div>
      </motion.div>
      <span className="mt-2 block text-center text-sm text-ash">Tap the card to flip it</span>
    </button>
  );
}

function ProfileForm({ member }) {
  const { actions } = useLibrary();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: member.name, email: member.email });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setForm({ name: member.name, email: member.email }); }, [member.name, member.email]);

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Add your name.");
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError("That email doesn't look right. Use something like you@example.com.");
    setError("");
    setBusy(true);
    try {
      await actions.updateProfile({ name: form.name.trim(), email: form.email.trim() });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const input = "h-11 w-full border border-bone/20 bg-slate px-3 text-bone focus:border-gold focus:outline-none";

  return (
    <div className="border border-bone/10 bg-slate p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center bg-plum font-display text-lg font-bold">{initials(member.name)}</span>
          <div>
            <p className="font-semibold">{member.name}</p>
            <p className="text-sm text-ash">{member.email || "No email yet"}</p>
          </div>
        </div>
        {!editing && (
          <Button size="sm" variant="line" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {editing && (
          <motion.form
            onSubmit={save}
            noValidate
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 pt-5">
              <label><span className="label">Name</span><input id="p-name" className={input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={80} /></label>
              <label><span className="label">Email</span><input id="p-email" type="email" className={input} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} maxLength={120} placeholder="you@example.com" /></label>
              {error && <p role="alert" className="border-l-4 border-wine bg-wine/20 px-3 py-2 text-sm">{error}</p>}
              <div className="flex gap-3">
                <Button type="submit" size="sm" disabled={busy}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />} Save profile</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(false); setError(""); setForm({ name: member.name, email: member.email }); }}>Cancel</Button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Page({ children }) {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-[1280px] py-12 lg:py-16"
      style={{ paddingLeft: "max(16px, env(safe-area-inset-left))", paddingRight: "max(16px, env(safe-area-inset-right))" }}
    >
      {children}
    </motion.main>
  );
}
