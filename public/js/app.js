/**
 * =============================================
 * app.js — Shared App Bootstrapper
 * คลังชีทเรียนสายรหัส | KMUTT CS Cheatsheet
 * =============================================
 * Loaded on both dashboard.html and admin.html
 * Handles: theme, keyboard shortcuts, global init
 */

(function () {
  // ── Init theme immediately (prevent flash) ──
  UI.initTheme();

  // ── Global keyboard shortcuts ───────────────
  document.addEventListener("keydown", e => {
    // CMD/CTRL + K → focus search
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      document.getElementById("global-search")?.focus();
    }
  });

  // ── Mark document as JS-loaded ──────────────
  document.documentElement.classList.add("js-loaded");
})();
