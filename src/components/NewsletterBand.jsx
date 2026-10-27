import { motion } from "framer-motion";
import { BlockNewsletter } from "@/components/ui/newsletter-signup-ticket";
import { useLibrary } from "../hooks/useLibrary.jsx";

/* "New arrivals" signup, using the 21st.dev newsletter ticket.
 * Subscribing saves the email to your member profile (an SQL UPDATE you can see
 * in Live activity). It's a demo library, so no emails are actually sent. */
export function NewsletterBand() {
  const { actions } = useLibrary();

  async function subscribe(email) {
    const { member } = await actions.profile();
    await actions.updateProfile({ name: member.name, email });
  }

  return (
    <section aria-label="New arrivals newsletter" className="grain relative overflow-hidden bg-plum py-16 lg:py-24"
      style={{ paddingLeft: "max(16px, env(safe-area-inset-left))", paddingRight: "max(16px, env(safe-area-inset-right))" }}>
      {/* a ticket stub, punched out of the band */}
      <motion.div
        initial={{ opacity: 0, y: 30, rotate: -2 }}
        whileInView={{ opacity: 1, y: 0, rotate: -1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ type: "spring", stiffness: 120, damping: 16 }}
        className="relative z-10 mx-auto w-full max-w-lg"
      >
        <span aria-hidden className="absolute -left-3 top-1/2 z-10 h-6 w-6 -translate-y-1/2 rounded-full bg-plum" />
        <span aria-hidden className="absolute -right-3 top-1/2 z-10 h-6 w-6 -translate-y-1/2 rounded-full bg-plum" />
        <BlockNewsletter
          className="shadow-2xl shadow-black/50"
          eyebrow="NEW ARRIVALS, WEEKLY"
          title="First to know when new titles hit the shelves"
          successMessage="On the list. Your email is on your library card now."
          footnote="Demo library: saved to your profile, no emails are actually sent."
          onSubscribe={subscribe}
        />
      </motion.div>
    </section>
  );
}
