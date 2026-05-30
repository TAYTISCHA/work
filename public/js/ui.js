/**
 * =============================================
 * ui.js — UI Utilities & Components
 * คลังชีทเรียนสายรหัส | KMUTT CS Cheatsheet
 * =============================================
 */

const UI = (() => {
  // ── Theme ───────────────────────────────────
  function initTheme() {
    const saved = localStorage.getItem(CONFIG.THEME_KEY) || CONFIG.DEFAULT_THEME;
    applyTheme(saved);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(CONFIG.THEME_KEY, theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  }

  function getTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  // ── Toast ───────────────────────────────────
  let toastQueue = [];
  let toastActive = false;

  function toast(message, type = "info") {
    // type: info | success | error | warning
    toastQueue.push({ message, type });
    if (!toastActive) processToastQueue();
  }

  function processToastQueue() {
    if (!toastQueue.length) { toastActive = false; return; }
    toastActive = true;
    const { message, type } = toastQueue.shift();

    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }

    const icons = { info: "ℹ️", success: "✅", error: "❌", warning: "⚠️" };
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${message}</span>`;
    container.appendChild(el);

    requestAnimationFrame(() => el.classList.add("show"));

    setTimeout(() => {
      el.classList.remove("show");
      el.addEventListener("transitionend", () => {
        el.remove();
        setTimeout(processToastQueue, 100);
      }, { once: true });
    }, CONFIG.TOAST_DURATION);
  }

  // ── Modal ───────────────────────────────────
  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    modal.querySelector(".modal-content")?.classList.add("scale-in");
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  function closeAllModals() {
    document.querySelectorAll(".modal.open").forEach(m => {
      m.classList.remove("open");
    });
    document.body.style.overflow = "";
  }

  // Close modal on backdrop click
  document.addEventListener("click", e => {
    if (e.target.classList.contains("modal")) closeAllModals();
  });

  // Close modal on Escape
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeAllModals();
  });

  // ── Skeleton Loading ────────────────────────
  function showSkeleton(container, count = 6) {
    container.innerHTML = Array(count).fill(0).map((_, i) => `
      <div class="skeleton-card" style="animation-delay:${i * 80}ms">
        <div class="skeleton-thumb"></div>
        <div class="skeleton-line w-70"></div>
        <div class="skeleton-line w-40"></div>
        <div class="skeleton-line w-55"></div>
      </div>
    `).join("");
  }

  function hideSkeleton(container) {
    const skeletons = container.querySelectorAll(".skeleton-card");
    skeletons.forEach(s => s.remove());
  }

  // ── Empty State ─────────────────────────────
  function showEmpty(container, message = "ไม่พบไฟล์", sub = "ลองค้นหาหรือเลือกหมวดหมู่ใหม่") {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <div class="empty-title">${message}</div>
        <div class="empty-sub">${sub}</div>
      </div>
    `;
  }

  // ── Confirm Dialog ──────────────────────────
  function confirm(message, onConfirm) {
    const existing = document.getElementById("confirm-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "confirm-modal";
    modal.className = "modal open";
    modal.innerHTML = `
      <div class="modal-content confirm-modal-content">
        <div class="confirm-icon">⚠️</div>
        <p class="confirm-msg">${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-ghost" id="confirm-cancel">ยกเลิก</button>
          <button class="btn btn-danger" id="confirm-ok">ยืนยัน</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("confirm-cancel").onclick = () => modal.remove();
    document.getElementById("confirm-ok").onclick = () => { modal.remove(); onConfirm(); };
  }

  // ── Sidebar Toggle ──────────────────────────
  function initSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggle = document.getElementById("sidebar-toggle");
    const overlay = document.getElementById("sidebar-overlay");
    if (!sidebar) return;

    toggle?.addEventListener("click", () => toggleSidebar());
    overlay?.addEventListener("click", () => closeSidebar());
  }

  function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar?.classList.toggle("open");
    document.getElementById("sidebar-overlay")?.classList.toggle("show");
  }

  function closeSidebar() {
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("sidebar-overlay")?.classList.remove("show");
  }

  // ── Loading State ───────────────────────────
  function setLoading(btnEl, loading) {
    if (!btnEl) return;
    if (loading) {
      btnEl._origText = btnEl.innerHTML;
      btnEl.innerHTML = `<span class="btn-spinner"></span>`;
      btnEl.disabled = true;
    } else {
      btnEl.innerHTML = btnEl._origText || btnEl.innerHTML;
      btnEl.disabled = false;
    }
  }

  // ── Bookmark ────────────────────────────────
  function getBookmarks() {
    try { return JSON.parse(localStorage.getItem(CONFIG.BOOKMARK_KEY) || "[]"); }
    catch { return []; }
  }

  function toggleBookmark(fileId) {
    let bookmarks = getBookmarks();
    const idx = bookmarks.indexOf(fileId);
    if (idx >= 0) bookmarks.splice(idx, 1);
    else bookmarks.push(fileId);
    localStorage.setItem(CONFIG.BOOKMARK_KEY, JSON.stringify(bookmarks));
    return idx < 0; // true = added
  }

  function isBookmarked(fileId) {
    return getBookmarks().includes(fileId);
  }

  // ── Recently Viewed ──────────────────────────
  function addRecent(file) {
    let recent = getRecent();
    recent = recent.filter(f => f.id !== file.id);
    recent.unshift(file);
    if (recent.length > CONFIG.RECENT_MAX) recent = recent.slice(0, CONFIG.RECENT_MAX);
    localStorage.setItem(CONFIG.RECENT_KEY, JSON.stringify(recent));
  }

  function getRecent() {
    try { return JSON.parse(localStorage.getItem(CONFIG.RECENT_KEY) || "[]"); }
    catch { return []; }
  }

  // ── Animate on scroll ───────────────────────
  function initScrollReveal() {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("revealed");
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
  }

  // ── Format Helpers ───────────────────────────
  function formatDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
  }

  function formatBytes(bytes) {
    if (!bytes) return "—";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0, b = bytes;
    while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
    return `${b.toFixed(1)} ${units[i]}`;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  return {
    initTheme, applyTheme, toggleTheme, getTheme,
    toast,
    openModal, closeModal, closeAllModals,
    showSkeleton, hideSkeleton, showEmpty,
    confirm,
    initSidebar, toggleSidebar, closeSidebar,
    setLoading,
    getBookmarks, toggleBookmark, isBookmarked,
    addRecent, getRecent,
    initScrollReveal,
    formatDate, formatBytes, escapeHtml,
  };
})();
