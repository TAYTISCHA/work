/**
 * =============================================
 * pages/dashboard.js — Dashboard Logic
 * =============================================
 */

(function () {
  // ── Auth Guard ─────────────────────────────
  const session = Auth.requireAuth();
  if (!session) return;
  Auth.startAutoLogout();
  window.initNavProfile(session);
  ProfileMenu.init(session);
  UI.initTheme();
  UI.initSidebar();
  UI.initScrollReveal();

  // ── State ───────────────────────────────────
  const state = {
    files: [],
    allFiles: [],
    currentPage: 1,
    totalPages: 1,
    filterCat: "",
    filterYear: "",
    search: "",
    currentPage_: "home",
  };

  // ── User Display ────────────────────────────
  document.getElementById("user-name").textContent = session.name || session.studentId;
  document.getElementById("user-role").textContent = session.role === CONFIG.ROLES.ADMIN ? "Senior" : "Junior";
  document.getElementById("user-avatar").textContent = (session.name || session.studentId)[0].toUpperCase();

  // Greeting
  const hour = new Date().getHours();
  const greet = hour < 12 ? "อรุณสวัสดิ์ ☀️" : hour < 18 ? "สวัสดีตอนบ่าย 👋" : "สวัสดีตอนเย็น 🌙";
  document.getElementById("greeting").textContent = `${greet}, ${session.name || "เพื่อน"}!`;

  // ── Load Announcements ───────────────────────
  async function loadAnnouncements() {
    try {
      const res = await API.getAnnouncements();
      if (!res.success || !res.data?.length) return;
      const container = document.getElementById("announcements-container");
      container.innerHTML = res.data.map(a => `
        <div class="announcement reveal">
          <div class="announcement-icon">📢</div>
          <div>
            <div class="announcement-title">${UI.escapeHtml(a.title)}</div>
            <div class="announcement-body">${UI.escapeHtml(a.body)}</div>
          </div>
        </div>
      `).join("");
      UI.initScrollReveal();
    } catch {}
  }

  // ── Load Files ───────────────────────────────
  async function loadFiles() {
    const grid = document.getElementById("file-grid");
    UI.showSkeleton(grid, 12);

    try {
      const res = await API.getFiles({
        year: state.filterYear,
        category: state.filterCat,
        search: state.search,
        page: state.currentPage,
      });

      if (!res.success) throw new Error(res.message);

      state.files = res.data || [];
      state.totalPages = res.totalPages || 1;

      renderFiles(grid, state.files);
      renderPagination();
    } catch (err) {
      UI.showEmpty(grid, "โหลดไฟล์ไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
      console.error("[Dashboard] loadFiles", err);
    }
  }

  // ── Render Files ─────────────────────────────
  function renderFiles(container, files) {
    if (!files.length) {
      UI.showEmpty(container);
      return;
    }

    container.innerHTML = files.map((f, i) => {
      const bookmarked = UI.isBookmarked(f.id);
      return `
        <div class="file-card reveal ${f.pinned ? "pinned" : ""}" data-id="${f.id}" style="animation-delay:${i * 40}ms">
          <div class="file-card-thumb">📄</div>
          <div class="file-card-body">
            <div class="file-card-name">${UI.escapeHtml(f.name)}</div>
            <div class="file-card-meta">
              <span class="tag tag-${f.category || "lecture"}">${categoryLabel(f.category)}</span>
              <span>${UI.formatBytes(f.size)}</span>
            </div>
            <div class="file-card-meta" style="margin-top:4px">
              <span>ปี ${f.year || "—"}</span>
              <span>·</span>
              <span>${f.subject || "—"}</span>
            </div>
          </div>
          <div class="file-card-actions">
            <button class="btn-icon bookmark-toggle" data-id="${f.id}" title="Bookmark" style="${bookmarked ? "color:var(--accent)" : ""}">
              ${bookmarked ? "🔖" : "🔖"}
            </button>
            <button class="btn-icon file-preview" data-id="${f.id}" data-name="${UI.escapeHtml(f.name)}" title="Preview">👁️</button>
            <a href="${API.getPreviewUrl(f.id)}" download="${UI.escapeHtml(f.name)}" class="btn-icon" title="Download" onclick="event.stopPropagation()">⬇️</a>
          </div>
        </div>
      `;
    }).join("");

    // Wire up card clicks
    container.querySelectorAll(".file-card").forEach(card => {
      card.addEventListener("click", e => {
        if (e.target.closest(".file-card-actions")) return;
        const id = card.dataset.id;
        const file = files.find(f => f.id === id);
        if (file) openPreview(file);
      });
    });

    // Wire bookmarks
    container.querySelectorAll(".bookmark-toggle").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const added = UI.toggleBookmark(id);
        btn.style.color = added ? "var(--accent)" : "";
        UI.toast(added ? "เพิ่ม Bookmark แล้ว 🔖" : "ลบ Bookmark แล้ว", added ? "success" : "info");
      });
    });

    // Wire preview buttons
    container.querySelectorAll(".file-preview").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const file = files.find(f => f.id === id);
        if (file) openPreview(file);
      });
    });

    UI.initScrollReveal();
  }

  function categoryLabel(cat) {
    const labels = { lecture: "บรรยาย", lab: "แลป", midterm: "กลางภาค", final: "ปลายภาค" };
    return labels[cat] || cat || "ทั่วไป";
  }

  // ── PDF Preview ──────────────────────────────
  function openPreview(file) {
    const modal = document.getElementById("pdf-modal");
    const iframe = document.getElementById("pdf-iframe");
    const title  = document.getElementById("pdf-modal-title");
    const dlBtn  = document.getElementById("pdf-download-btn");

    title.textContent = file.name;
    iframe.src = API.getPreviewUrl(file.id);

    dlBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = API.getPreviewUrl(file.id);
      a.download = file.name;
      a.click();
    };

    UI.openModal("pdf-modal");
    UI.addRecent(file);
    API.logView(file.id);
  }

  document.getElementById("pdf-close-btn").addEventListener("click", () => UI.closeModal("pdf-modal"));

  // ── Pagination ───────────────────────────────
  function renderPagination() {
    const container = document.getElementById("pagination");
    if (state.totalPages <= 1) { container.innerHTML = ""; return; }

    const pages = [];
    for (let i = 1; i <= state.totalPages; i++) pages.push(i);

    container.innerHTML = `
      <button class="page-btn" id="pg-prev" ${state.currentPage === 1 ? "disabled" : ""}>‹</button>
      ${pages.map(p => `
        <button class="page-btn ${p === state.currentPage ? "active" : ""}" data-page="${p}">${p}</button>
      `).join("")}
      <button class="page-btn" id="pg-next" ${state.currentPage === state.totalPages ? "disabled" : ""}>›</button>
    `;

    container.querySelector("#pg-prev")?.addEventListener("click", () => goPage(state.currentPage - 1));
    container.querySelector("#pg-next")?.addEventListener("click", () => goPage(state.currentPage + 1));
    container.querySelectorAll("[data-page]").forEach(btn => {
      btn.addEventListener("click", () => goPage(Number(btn.dataset.page)));
    });
  }

  function goPage(n) {
    state.currentPage = n;
    loadFiles();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Filter Chips ─────────────────────────────
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.filterCat = chip.dataset.filter || "";
      state.currentPage = 1;
      loadFiles();
    });
  });

  // ── Sidebar Filters ──────────────────────────
  document.querySelectorAll("[data-filter-year]").forEach(item => {
    item.addEventListener("click", () => {
      setActiveSidebar(item);
      state.filterYear = item.dataset.filterYear;
      state.filterCat  = "";
      state.currentPage = 1;
      showPage("home");
      loadFiles();
    });
  });

  document.querySelectorAll("[data-filter-cat]").forEach(item => {
    item.addEventListener("click", () => {
      setActiveSidebar(item);
      state.filterCat  = item.dataset.filterCat;
      state.filterYear = "";
      state.currentPage = 1;
      showPage("home");
      loadFiles();
    });
  });

  function setActiveSidebar(el) {
    document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("active"));
    el.classList.add("active");
  }

  // ── Page Navigation ──────────────────────────
  document.querySelectorAll("[data-page]").forEach(item => {
    item.addEventListener("click", () => {
      setActiveSidebar(item);
      showPage(item.dataset.page);
    });
  });

  function showPage(name) {
    document.getElementById("page-home")?.classList.toggle("hidden", name !== "home");
    document.getElementById("page-recent")?.classList.toggle("hidden", name !== "recent");
    document.getElementById("page-bookmarks")?.classList.toggle("hidden", name !== "bookmarks");

    if (name === "recent") renderRecentPage();
    if (name === "bookmarks") renderBookmarksPage();
    UI.closeSidebar();
  }

  // ── Recent Page ───────────────────────────────
  function renderRecentPage() {
    const grid = document.getElementById("recent-grid");
    const recent = UI.getRecent();
    if (!recent.length) { UI.showEmpty(grid, "ยังไม่มีไฟล์ที่ดูล่าสุด", "เริ่มดูไฟล์ได้เลย!"); return; }
    renderFiles(grid, recent);
  }

  // ── Bookmarks Page ────────────────────────────
  function renderBookmarksPage() {
    const grid = document.getElementById("bookmarks-grid");
    const ids = UI.getBookmarks();
    const bookmarked = state.allFiles.filter(f => ids.includes(f.id));
    if (!bookmarked.length) { UI.showEmpty(grid, "ยังไม่มี Bookmark", "กด 🔖 บนไฟล์ที่ต้องการ Bookmark"); return; }
    renderFiles(grid, bookmarked);
  }

  // ── Search ────────────────────────────────────
  let searchDebounce;
  document.getElementById("global-search").addEventListener("input", e => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.search = e.target.value.trim();
      state.currentPage = 1;
      showPage("home");
      setActiveSidebar(document.querySelector('[data-page="home"]'));
      loadFiles();
    }, 380);
  });

  // ── Theme Toggle ─────────────────────────────
  document.getElementById("theme-toggle").addEventListener("click", () => {
    UI.toggleTheme();
    document.getElementById("theme-toggle").textContent = UI.getTheme() === "dark" ? "☀️" : "🌙";
  });
  // Init icon
  document.getElementById("theme-toggle").textContent = UI.getTheme() === "dark" ? "☀️" : "🌙";

  // ── Logout ────────────────────────────────────
  document.getElementById("logout-btn").addEventListener("click", () => {
    UI.confirm("ต้องการออกจากระบบใช่ไหม?", () => Auth.logout());
  });

  // ── Bookmark Nav Button ───────────────────────
  document.getElementById("bookmark-btn").addEventListener("click", () => {
    showPage("bookmarks");
    setActiveSidebar(document.querySelector('[data-page="bookmarks"]'));
  });

  // ── Boot ──────────────────────────────────────
  loadAnnouncements();
  loadFiles();

  // Preload all files for bookmarks/recent cross-ref
  API.getFiles({ page: 1, pageSize: 200 }).then(res => {
    if (res.success) state.allFiles = res.data || [];
  }).catch(() => {});
})();
