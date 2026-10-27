import { Database } from "lucide-react";
import { useLibrary } from "../hooks/useLibrary.jsx";

export function Footer() {
  const { mode } = useLibrary();
  return (
    <footer className="border-t border-bone/10 bg-[#0b0b0e] py-8 text-sm text-ash"
      style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4"
        style={{ paddingLeft: "max(16px, env(safe-area-inset-left))", paddingRight: "max(16px, env(safe-area-inset-right))" }}>
        <p>
          Web version of the{" "}
          <a className="text-bone underline underline-offset-4" href="https://github.com/carlosz98/Library-Management-System---Java">
            Library Management System in Java
          </a>{" "}
          by Carlos Zabala.
        </p>
        <p className="flex items-center gap-2"><Database className="h-4 w-4" /> Data: {mode || "loading"}</p>
      </div>
    </footer>
  );
}
