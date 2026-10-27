import { forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils.js";

/* shadcn-style button with a framer-motion press.
 * variant: solid (bone), line (outlined), ghost (text), gold, danger */
const VARIANTS = {
  solid: "bg-bone text-ink border-bone hover:bg-white",
  line: "bg-transparent text-bone border-bone/70 hover:bg-bone/10",
  ghost: "bg-transparent text-bone border-transparent hover:bg-bone/10",
  gold: "bg-gold text-ink border-gold hover:bg-[#d8b977]",
  danger: "bg-wine text-bone border-wine hover:bg-[#9d3c4c]",
};
const SIZES = {
  sm: "h-9 px-3.5 text-[0.72rem] gap-1.5",
  md: "h-11 px-5 text-[0.8rem] gap-2",
  lg: "h-14 px-7 text-[0.9rem] gap-2.5",
  icon: "h-10 w-10 p-0 justify-center",
};

export const Button = forwardRef(function Button(
  { as = "button", variant = "solid", size = "md", className, children, ...props },
  ref
) {
  const Comp = motion[as] || motion.button;
  return (
    <Comp
      ref={ref}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "inline-flex select-none items-center border font-display font-semibold uppercase tracking-[0.14em]",
        "transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});
