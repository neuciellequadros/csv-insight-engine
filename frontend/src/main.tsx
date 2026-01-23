import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

(function initTheme() {
  const saved = localStorage.getItem("theme") as "light" | "dark" | null;
  const system = window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  const theme = saved ?? system;

  const html = document.documentElement;
  html.classList.remove("light", "dark");
  html.classList.add(theme);
  html.style.colorScheme = theme;
})();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
