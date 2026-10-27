import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { cn } from "../../lib/utils.js";

/* A card with a soft light that follows the pointer (21st.dev-style spotlight). */
export function SpotlightCard({ as = "div", className, children, color = "rgba(201, 168, 101, 0.14)", ...props }) {
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);
  const background = useMotionTemplate`radial-gradient(320px circle at ${x}px ${y}px, ${color}, transparent 70%)`;
  const Comp = motion[as] || motion.div;

  return (
    <Comp
      onPointerMove={e => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      onPointerLeave={() => { x.set(-400); y.set(-400); }}
      className={cn("group relative overflow-hidden", className)}
      {...props}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-10" style={{ background }} />
      {children}
    </Comp>
  );
}
