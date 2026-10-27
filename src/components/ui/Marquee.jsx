import { cn } from "../../lib/utils.js";

/* Endless scrolling strip. The list is drawn twice so the loop is seamless;
 * hovering pauses it, and it stops entirely with reduce-motion on. */
export function Marquee({ children, className }) {
  return (
    <div className={cn("group overflow-hidden whitespace-nowrap", className)} aria-hidden>
      <div className="inline-flex animate-marquee group-hover:[animation-play-state:paused]">
        <div className="inline-flex">{children}</div>
        <div className="inline-flex">{children}</div>
      </div>
    </div>
  );
}
