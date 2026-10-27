import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { openLibrary, MAX_PER_CHECKOUT } from "../lib/library.js";
import { storage } from "../lib/utils.js";

/* One place that owns the library: the store (PHP or browser SQLite),
 * the items, the activity log, the bag and the toasts. Components call
 * the actions here and everything redraws from fresh data. */

const LibraryContext = createContext(null);
const BAG_KEY = "library-of-tomorrow-bag";

export function LibraryProvider({ children }) {
  const storeRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [mode, setMode] = useState("");
  const [items, setItems] = useState([]);
  const [activity, setActivity] = useState([]);
  const [version, setVersion] = useState(0); // bumps after every write, so pages refetch details
  const [bag, setBag] = useState(() => storage.get(BAG_KEY, []));
  const [bagOpen, setBagOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [justBorrowed, setJustBorrowed] = useState(new Set());

  const toast = useCallback((message, tone = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t.slice(-3), { id, message, tone }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);
  const dismissToast = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);

  const refresh = useCallback(async () => {
    const store = storeRef.current;
    if (!store) return;
    const [nextItems, nextActivity] = await Promise.all([store.allItems(), store.recentActivity()]);
    setItems(nextItems);
    setActivity(nextActivity);
    setVersion(v => v + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const store = await openLibrary();
        if (cancelled) return;
        storeRef.current = store;
        setMode(store.label);
        await refresh();
        setStatus("ready");
      } catch (e) {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  useEffect(() => storage.set(BAG_KEY, bag), [bag]);

  // run a store action, show its message, redraw
  const run = useCallback(async (fn, { tone = "info", quiet = false } = {}) => {
    try {
      const result = await fn(storeRef.current);
      const message = typeof result === "string" ? result : result?.message;
      if (message && !quiet) {
        const failed = /not available|not found|was not borrowed|invalid/i.test(message);
        toast(message, failed ? "error" : tone);
      }
      await refresh();
      return result;
    } catch (e) {
      toast(e.message, "error");
      await refresh().catch(() => {});
      throw e;
    }
  }, [refresh, toast]);

  const actions = useMemo(() => ({
    borrow: id => {
      setJustBorrowed(new Set([id]));
      return run(s => s.borrow(id), { tone: "success" });
    },
    giveBack: id => run(s => s.giveBack(id), { tone: "success" }),
    donate: fields => run(s => s.donate(fields), { tone: "success" }),
    reset: () => run(s => s.reset()).then(r => { setBag([]); return r; }),
    checkout: order => run(s => s.checkout(order), { quiet: true }).then(r => {
      setJustBorrowed(new Set(order.ids));
      setBag([]);
      return r;
    }),
    payFines: payment => run(s => s.payFines(payment), { tone: "success" }),
    updateProfile: fields => run(s => s.updateProfile(fields), { tone: "success" }),
    profile: () => storeRef.current.profile(),
    itemDetail: id => storeRef.current.itemDetail(id),
    store: () => storeRef.current,
  }), [run]);

  const bagRef = useRef(bag);
  bagRef.current = bag;

  const bagActions = useMemo(() => ({
    add(id, title) {
      const b = bagRef.current;
      if (b.includes(id)) return;
      if (b.length >= MAX_PER_CHECKOUT) {
        toast(`Your bag holds ${MAX_PER_CHECKOUT} items at a time. Check out first, then add more.`, "error");
        return;
      }
      setBag([...b, id]);
      toast(`Added ${title} to your bag.`, "success");
    },
    remove: id => setBag(b => b.filter(x => x !== id)),
    clear: () => setBag([]),
    open: () => setBagOpen(true),
    close: () => setBagOpen(false),
  }), [toast]);

  const value = {
    status, mode, items, activity, version, toasts, dismissToast, toast,
    bag, bagOpen, bagActions, justBorrowed, actions,
  };
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return ctx;
}
