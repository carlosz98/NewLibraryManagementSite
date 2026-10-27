import { useEffect, useState } from "react";

/* Hash routes, so every page has a link you can share or bookmark:
 *   #item-12    an item's description page
 *   #checkout   checkout
 *   #profile    your member profile
 *   anything else (or #catalog, #donate, #activity) is the home page,
 *   scrolled to that section
 */
export function parseRoute(hash = window.location.hash) {
  const h = hash.replace(/^#/, "");
  const item = /^item-(\d+)$/.exec(h);
  if (item) return { page: "item", id: Number(item[1]) };
  if (h === "checkout") return { page: "checkout" };
  if (h === "profile") return { page: "profile" };
  return { page: "home", section: h || null };
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute());
  useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

export function go(hash) {
  const target = hash.startsWith("#") ? hash : `#${hash}`;
  if (window.location.hash === target) {
    // same hash: still honor the click (scroll back to the section)
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = target;
  }
}
