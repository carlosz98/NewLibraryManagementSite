import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LibraryProvider, useLibrary } from "./hooks/useLibrary.jsx";
import { go, useRoute } from "./hooks/useRoute.js";
import { Navbar } from "./components/Navbar.jsx";
import { Hero } from "./components/Hero.jsx";
import { FormatBento } from "./components/FormatBento.jsx";
import { Catalog } from "./components/Catalog.jsx";
import { DonatePanel } from "./components/DonatePanel.jsx";
import { ActivityLog } from "./components/ActivityLog.jsx";
import { Footer } from "./components/Footer.jsx";
import { BagSheet } from "./components/BagSheet.jsx";
import { NewsletterBand } from "./components/NewsletterBand.jsx";
import { Marquee } from "./components/ui/Marquee.jsx";
import { Toaster } from "./components/ui/Toaster.jsx";
import { ItemPage } from "./pages/ItemPage.jsx";
import { CheckoutPage } from "./pages/CheckoutPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";

export default function App() {
  return (
    <LibraryProvider>
      <Shell />
    </LibraryProvider>
  );
}

function Shell() {
  const route = useRoute();
  const { toasts, dismissToast } = useLibrary();

  // catalog filters live here so the format blocks can set them
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState("title");

  // home sections: scroll to #catalog / #donate / #activity after the page renders
  useEffect(() => {
    if (route.page !== "home") return;
    if (!route.section) return;
    const t = setTimeout(() => document.getElementById(route.section)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    return () => clearTimeout(t);
  }, [route]);

  const pageKey = route.page === "item" ? `item-${route.id}` : route.page;

  return (
    <>
      <a href="#catalog" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-bone focus:px-4 focus:py-2 focus:text-ink">
        Skip to the catalog
      </a>
      <Navbar />
      {/* pages fade in; no exit wait, so nested animated lists can never hold a page change up */}
      <motion.div key={pageKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          {route.page === "item" && <ItemPage id={route.id} />}
          {route.page === "checkout" && <CheckoutPage />}
          {route.page === "profile" && <ProfilePage />}
          {route.page === "home" && (
            <main>
              <Hero />
              <TitleTicker />
              <FormatBento onPick={type => { setFilter(type); setQuery(""); go("catalog"); }} />
              <Catalog
                filter={filter} setFilter={setFilter}
                query={query} setQuery={setQuery}
                onlyAvailable={onlyAvailable} setOnlyAvailable={setOnlyAvailable}
                sort={sort} setSort={setSort}
              />
              <section aria-label="Donations and activity" className="grid border-t border-bone/10 lg:grid-cols-2">
                <DonatePanel />
                <ActivityLog />
              </section>
              <NewsletterBand />
            </main>
          )}
      </motion.div>
      <Footer />
      <BagSheet />
      <Toaster toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

function TitleTicker() {
  const { items } = useLibrary();
  if (!items.length) return <div className="h-[46px] border-y border-bone/10 bg-coal" />;
  return (
    <Marquee className="border-y border-bone/10 bg-coal py-3">
      {items.map(it => (
        <span key={it.id} className="flex items-center font-display text-[0.95rem] font-light uppercase tracking-[0.2em] text-ash">
          <span className="px-5">{it.title}</span>
          <span className="text-ochre">✦</span>
        </span>
      ))}
    </Marquee>
  );
}
