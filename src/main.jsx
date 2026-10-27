import React from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import App from "./App.jsx";

// fonts ship with the site (no Google Fonts request): Barlow Condensed for display,
// Barlow for text, JetBrains Mono for labels and SQL, Mrs Saint Delafield for the signature
import "@fontsource/barlow-condensed/300.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/barlow/300.css";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow/800.css";
import "@fontsource/barlow/400-italic.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/mrs-saint-delafield/400.css";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* "user": framer-motion follows the visitor's reduce-motion setting */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </React.StrictMode>
);
