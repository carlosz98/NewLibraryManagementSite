import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/* Counts up to `value` the first time it scrolls into view, then follows changes. */
export function NumberTicker({ value, className, duration = 1.2 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const started = useRef(false);

  useEffect(() => {
    if (reduce) { setShown(value); return; }
    if (!inView) return;
    const from = started.current ? shown : 0;
    started.current = true;
    const controls = animate(from, value, {
      duration: from === 0 ? duration : 0.5,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: v => setShown(Math.round(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, reduce]);

  return <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>{shown}</span>;
}
