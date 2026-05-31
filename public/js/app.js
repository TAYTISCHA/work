/**
 * app.js — Shared Bootstrap
 * Profile dropdown + Theme + Sidebar shared logic
 */
(function () {
  UI.initTheme();

  // ── Theme toggle ──────────────────────────────
  function updateThemeIcons() {
    const isDark = UI.getTheme() === "dark";
    const moon = document.getElementById("icon-moon");
    const sun  = document.getElementById("icon-sun");
    if (moon) moon.style.display = isDark ? "none"  : "block";
    if (sun)  sun.style.display  = isDark ? "block" : "none";
  }

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    UI.toggleTheme();
    updateThemeIcons();
  });

  updateThemeIcons();

  // ── Nav Profile Dropdown ──────────────────────
  let dropOpen = false;

  function initNavProfile(session) {
    const btn      = document.getElementById("nav-profile-btn");
    const dropdown = document.getElementById("nav-dropdown");
    const navName  = document.getElementById("nav-name");
    const navAvatar = document.getElementById("nav-avatar");
    const ndName   = document.getElementById("nd-name");
    const ndSid    = document.getElementById("nd-sid");

    if (!btn || !dropdown) return;

    // Fill info
    const name = session.name || session.studentId;
    if (navName)   navName.textContent   = name;
    if (navAvatar) navAvatar.textContent  = name[0].toUpperCase();
    if (ndName)    ndName.textContent    = name;
    if (ndSid)     ndSid.textContent     = session.studentId;

    // Toggle
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropOpen = !dropOpen;
      dropdown.classList.toggle("show", dropOpen);
    });

    // Close on outside click
    document.addEventListener("click", () => {
      dropOpen = false;
      dropdown.classList.remove("show");
    });

    // Logout (dashboard)
    document.getElementById("nd-logout")?.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.remove("show");
      UI.confirm("ต้องการออกจากระบบใช่ไหม?", () => Auth.logout());
    });
  }

  // expose สำหรับ pages
  window.initNavProfile = initNavProfile;

  // ── Sidebar toggle ────────────────────────────
  UI.initSidebar();

  // ── Keyboard shortcut ─────────────────────────
  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      document.getElementById("global-search")?.focus();
    }
  });
})();
