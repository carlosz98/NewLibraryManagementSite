import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn-style class merger: later classes win over earlier conflicting ones
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function hashOf(s) {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// Cover art: a diagonal split of two muted colors + an object color,
// picked from the title so each item keeps its look on every visit
const COLORWAYS = [
  // [left, right, object]
  ["#2f5552", "#a07c3a", "#5a1e28"], // teal / ochre / oxblood
  ["#5a1e28", "#3f2f48", "#a07c3a"], // oxblood / plum / ochre
  ["#46523a", "#24272f", "#7a4128"], // moss / slate / rust
  ["#3f2f48", "#2f5552", "#8a3442"], // plum / teal / wine
  ["#7a4128", "#1c1e24", "#46523a"], // rust / slate / moss
  ["#a07c3a", "#46523a", "#3f2f48"], // ochre / moss / plum
];
const ANGLES = ["115deg", "65deg", "135deg", "100deg"];

export function coverLook(item) {
  const h = hashOf(item.title + item.creator);
  const [c1, c2, obj] = COLORWAYS[h % COLORWAYS.length];
  return {
    h,
    style: { "--c1": c1, "--c2": c2, "--obj": obj, "--angle": ANGLES[(h >>> 4) % ANGLES.length] },
  };
}

// Each format has a block color (bento, chips, accents)
export const TYPE_COLOR = {
  book: "bg-oxblood",
  manga: "bg-plum",
  comic: "bg-rust",
  vinyl: "bg-teal",
  movie: "bg-moss",
};

export function formatDate(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(String(d).replace(" ", "T") + (String(d).includes("T") ? "" : "Z"));
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(utc) {
  const d = new Date(String(utc).replace(" ", "T") + "Z");
  return isNaN(d) ? utc : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("") || "?";
}

// Split SQL into keyword / plain parts so React can color the keywords
const SQL_KW = /\b(SELECT|INSERT INTO|UPDATE|DELETE FROM|VALUES|SET|WHERE|FROM|AND|IS NULL|LEFT JOIN|JOIN|ON|ORDER BY|DESC|NULL)\b/g;
export function sqlParts(sql) {
  const parts = [];
  let last = 0;
  for (const m of String(sql).matchAll(SQL_KW)) {
    if (m.index > last) parts.push({ kw: false, text: sql.slice(last, m.index) });
    parts.push({ kw: true, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < sql.length) parts.push({ kw: false, text: sql.slice(last) });
  return parts;
}

// localStorage that never throws (private windows, blocked storage)
export const storage = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable: keep working in memory */
    }
  },
};
