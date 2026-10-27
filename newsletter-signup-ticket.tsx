"use client";

/* Newsletter signup ticket (from 21st.dev).
 * Integration changes from the original, all backward compatible:
 *   - the copy is now props, with the original text as defaults
 *   - the email field is `required`, so an empty submit doesn't "subscribe"
 *   - optional onSubscribe(email) callback, so the app can save the address
 */

import * as React from "react";
import { Button } from "@/components/ui/newsletter-signup-ticket-utils/button";
import { Input } from "@/components/ui/newsletter-signup-ticket-utils/input";
import {
  Card,
  CardContent,
} from "@/components/ui/newsletter-signup-ticket-utils/card";

export interface BlockNewsletterProps {
  eyebrow?: string;
  title?: string;
  successMessage?: string;
  footnote?: string;
  buttonLabel?: string;
  className?: string;
  /** Called with the email on submit. Throw to show an error instead of the success message. */
  onSubscribe?: (email: string) => void | Promise<void>;
}

export function BlockNewsletter({
  eyebrow = "WEEKLY PLAYBILL",
  title = "First to know when doors open",
  successMessage = "On the list. See you at doors.",
  footnote = "No spam. Unsubscribe anytime.",
  buttonLabel = "Subscribe",
  className,
  onSubscribe,
}: BlockNewsletterProps = {}) {
  const [done, setDone] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  return (
    <Card className={className ? `w-full ${className}` : "w-full"}>
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:p-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="max-w-md font-mono text-2xl font-black uppercase tracking-tight">
          {title}
        </h2>
        {done ? (
          <p
            role="status"
            className="font-mono text-xs uppercase tracking-wider text-foreground"
          >
            {successMessage}
          </p>
        ) : (
          <form
            className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              setBusy(true);
              try {
                await onSubscribe?.(email.trim());
                setDone(true);
              } catch (err) {
                setError(err instanceof Error ? err.message : "That didn't go through. Try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Input
              placeholder="Email address"
              type="email"
              aria-label="Email address"
              className="flex-1"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" disabled={busy}>{buttonLabel}</Button>
          </form>
        )}
        {error && (
          <p role="alert" className="font-mono text-xs uppercase tracking-wider text-destructive">
            {error}
          </p>
        )}
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {footnote}
        </p>
      </CardContent>
    </Card>
  );
}

export default BlockNewsletter;
