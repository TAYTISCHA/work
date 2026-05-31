/**
 * =============================================
 * pages/admin.js — Admin Dashboard Logic
 * =============================================
 */

(function () {
  // ── Auth Guard (Admin only) ──────────────────
  const session = Auth.requireAdmin();
  if (!session) return;
  Auth.startAutoLogout();
  window.initNavProfile(session);
  UI.initTheme();
  UI.initSidebar();

  document.getElementById("user-name").textContent = session.name || session.studentId;
  document.getElementById("user-avatar").textContent = (session.name || session.studentId)[0].toUpperCase();

  // ── Page Navigation ──────────────────────────
  const pages = ["overview", "files", "users", "announcements", "analytics"];

  function showPage(name) {
    pages.forEach(p => {
      document.getElementById(`page-${p}`)?.classList.toggle("hidden", p !== name);
    });
    document.querySelectorAll(".sidebar-item[data-page]").forEach(i => {
      i.classList.toggle("active", i.dataset.page === name);
    });
    UI.closeSidebar();

    // Lazy load page data
    if (name === "files")         loadAdminFiles();
    if (name === "users")         loadUsers();
    if (name === "announcements") loadAnnouncements();
    if (name === "analytics")     loadAnalytics();
  }

  document.querySelectorAll(".sidebar-item[data-page]").forEach(item => {
    item.addEventListener("click", () => showPage(item.dataset.page));
  });

  // ── Overview ─────────────────────────────────
  async function loadOverview() {
    try {
      const res = await API.getAnalytics();
      if (!res.success) return;
      const d = res.data;
      document.getElementById("stat-files").textContent     = d.totalFiles     ?? "—";
      document.getElementById("stat-users").textContent     = d.totalUsers     ?? "—";
      document.getElementById("stat-views").textContent     = d.totalViews     ?? "—";
      document.getElementById("stat-downloads").textContent = d.totalDownloads ?? "—";

      // Recent activity
      const container = document.getElementById("recent-activity");
      if (d.recentActivity?.length) {
        container.innerHTML = d.recentActivity.map(a => `
          <div class="activity-item">
            <span class="activity-icon">${a.type === "view" ? "👁️" : "⬇️"}</span>
            <span class="text-sm">${UI.escapeHtml(a.studentId)} · ${UI.escapeHtml(a.fileName)}</span>
            <span class="text-xs text-tertiary" style="margin-left:auto">${UI.formatDate(a.at)}</span>
          </div>
        `).join("");
      } else {
        container.innerHTML = `<div class="text-secondary text-sm">ยังไม่มีกิจกรรม</div>`;
      }
    } catch (err) {
      console.error("[Admin] loadOverview", err);
    }
  }

  // ── Files Management ─────────────────────────
  let adminFilesPage = 1;
  let adminSearch = "";

  async function loadAdminFiles() {
    const grid = document.getElementById("admin-file-grid");
    UI.showSkeleton(grid, 12);
    try {
      const res = await API.getFiles({ search: adminSearch, page: adminFilesPage });
      if (!res.success) throw new Error();
      renderAdminFiles(grid, res.data || []);
      renderAdminPagination(res.totalPages || 1);
    } catch {
      UI.showEmpty(grid, "โหลดไฟล์ไม่สำเร็จ");
    }
  }

  function renderAdminFiles(container, files) {
    if (!files.length) { UI.showEmpty(container); return; }
    container.innerHTML = files.map(f => `
      <div class="file-card" data-id="${f.id}">
        <div class="file-card-thumb">📄
          ${f.pinned ? '<span style="position:absolute;top:8px;left:8px;font-size:14px">📌</span>' : ''}
        </div>
        <div class="file-card-body">
          <div class="file-card-name">${UI.escapeHtml(f.name)}</div>
          <div class="file-card-meta">
            <span class="tag tag-${f.category || "lecture"}">${f.category || "lecture"}</span>
            <span>${UI.formatBytes(f.size)}</span>
          </div>
          <div class="file-card-meta" style="margin-top:6px;gap:4px">
            <button class="btn btn-ghost btn-sm admin-rename" data-id="${f.id}" data-name="${UI.escapeHtml(f.name)}">✏️</button>
            <button class="btn btn-ghost btn-sm admin-pin ${f.pinned ? "text-accent" : ""}" data-id="${f.id}" data-pinned="${f.pinned}">📌</button>
            <button class="btn btn-danger btn-sm admin-delete" data-id="${f.id}" data-name="${UI.escapeHtml(f.name)}">🗑️</button>
          </div>
        </div>
      </div>
    `).join("");

    // Wire rename
    container.querySelectorAll(".admin-rename").forEach(btn => {
      btn.addEventListener("click", () => {
        document.getElementById("rename-file-id").value = btn.dataset.id;
        document.getElementById("rename-input").value   = btn.dataset.name;
        UI.openModal("rename-modal");
      });
    });

    // Wire pin
    container.querySelectorAll(".admin-pin").forEach(btn => {
      btn.addEventListener("click", async () => {
        const pinned = btn.dataset.pinned === "true";
        UI.setLoading(btn, true);
        try {
          await API.pinFile(btn.dataset.id, !pinned);
          UI.toast(!pinned ? "📌 Pin แล้ว" : "ยกเลิก Pin แล้ว", "success");
          loadAdminFiles();
        } catch {
          UI.toast("เกิดข้อผิดพลาด", "error");
        } finally {
          UI.setLoading(btn, false);
        }
      });
    });

    // Wire delete
    container.querySelectorAll(".admin-delete").forEach(btn => {
      btn.addEventListener("click", () => {
        UI.confirm(`ต้องการลบ "${btn.dataset.name}" ใช่ไหม?`, async () => {
          try {
            await API.deleteFile(btn.dataset.id);
            UI.toast("ลบไฟล์แล้ว 🗑️", "success");
            loadAdminFiles();
          } catch {
            UI.toast("ลบไม่สำเร็จ", "error");
          }
        });
      });
    });
  }

  function renderAdminPagination(totalPages) {
    const container = document.getElementById("admin-pagination");
    if (totalPages <= 1) { container.innerHTML = ""; return; }
    container.innerHTML = Array.from({ length: totalPages }, (_, i) => i + 1).map(p => `
      <button class="page-btn ${p === adminFilesPage ? "active" : ""}" data-page="${p}">${p}</button>
    `).join("");
    container.querySelectorAll("[data-page]").forEach(btn => {
      btn.addEventListener("click", () => { adminFilesPage = Number(btn.dataset.page); loadAdminFiles(); });
    });
  }

  document.getElementById("admin-search").addEventListener("input", e => {
    clearTimeout(window._adminSearchTimeout);
    window._adminSearchTimeout = setTimeout(() => {
      adminSearch = e.target.value.trim();
      adminFilesPage = 1;
      loadAdminFiles();
    }, 380);
  });

  // Rename submit
  document.getElementById("rename-submit-btn").addEventListener("click", async () => {
    const id   = document.getElementById("rename-file-id").value;
    const name = document.getElementById("rename-input").value.trim();
    if (!name) { UI.toast("กรุณาใส่ชื่อ", "warning"); return; }
    const btn = document.getElementById("rename-submit-btn");
    UI.setLoading(btn, true);
    try {
      await API.renameFile(id, name);
      UI.toast("เปลี่ยนชื่อแล้ว ✏️", "success");
      UI.closeModal("rename-modal");
      loadAdminFiles();
    } catch {
      UI.toast("เกิดข้อผิดพลาด", "error");
    } finally {
      UI.setLoading(btn, false);
    }
  });

  // ── Upload ────────────────────────────────────
  const dropZone  = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");

  document.getElementById("upload-btn").addEventListener("click", () => UI.openModal("upload-modal"));

  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    handleFileSelect(e.dataTransfer.files);
  });

  fileInput.addEventListener("change", () => handleFileSelect(fileInput.files));

  function handleFileSelect(files) {
    const file = files[0];
    if (!file) return;
    if (file.type !== "application/pdf") { UI.toast("รองรับเฉพาะไฟล์ PDF", "warning"); return; }

    document.getElementById("upload-name").value = file.name.replace(/\.pdf$/i, "");
    document.getElementById("upload-form").style.display = "block";
    dropZone._file = file;
  }

  document.getElementById("upload-submit-btn").addEventListener("click", async () => {
    const file = dropZone._file;
    if (!file) { UI.toast("กรุณาเลือกไฟล์ก่อน", "warning"); return; }

    const name     = document.getElementById("upload-name").value.trim();
    const year     = document.getElementById("upload-year").value;
    const category = document.getElementById("upload-category").value;
    const subject  = document.getElementById("upload-subject").value.trim();

    if (!name) { UI.toast("กรุณาใส่ชื่อไฟล์", "warning"); return; }

    const btn = document.getElementById("upload-submit-btn");
    UI.setLoading(btn, true);

    // Read file as base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const progressBar  = document.getElementById("upload-progress-bar");
      const progressFill = document.getElementById("upload-progress-fill");
      progressBar.style.display = "block";
      progressFill.style.width = "30%";

      try {
        const base64 = reader.result.split(",")[1];
        progressFill.style.width = "60%";

        await API.uploadFile({ name, year, category, subject, base64, mimeType: "application/pdf" });
        progressFill.style.width = "100%";

        setTimeout(() => {
          UI.toast("Upload สำเร็จ 🎉", "success");
          UI.closeModal("upload-modal");
          document.getElementById("upload-form").style.display = "none";
          progressBar.style.display = "none";
          progressFill.style.width = "0%";
          dropZone._file = null;
          fileInput.value = "";
          loadAdminFiles();
        }, 400);
      } catch {
        UI.toast("Upload ไม่สำเร็จ กรุณาลองใหม่", "error");
      } finally {
        UI.setLoading(btn, false);
      }
    };
  });

  // ── Users Management ──────────────────────────
  async function loadUsers() {
    const tbody = document.getElementById("users-tbody");
    tbody.innerHTML = `<tr><td colspan="5" class="text-secondary text-sm" style="text-align:center;padding:32px">กำลังโหลด...</td></tr>`;
    try {
      const res = await API.getUsers();
      if (!res.success || !res.data?.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-secondary text-sm" style="text-align:center;padding:32px">ไม่พบผู้ใช้</td></tr>`;
        return;
      }
      tbody.innerHTML = res.data.map(u => `
        <tr>
          <td class="font-mono text-sm">${UI.escapeHtml(u.studentId)}</td>
          <td>${UI.escapeHtml(u.name || "—")}</td>
          <td><span class="tag ${u.role === "senior" ? "tag-final" : "tag-lecture"}">${u.role === "senior" ? "Senior 🔑" : "Junior"}</span></td>
          <td><span class="tag tag-lab">Active</span></td>
          <td>
            <div class="flex gap-2">
              <button class="btn btn-ghost btn-sm reset-pw" data-id="${u.studentId}">🔑 Reset PW</button>
              <button class="btn btn-ghost btn-sm edit-user" data-id="${u.studentId}" data-name="${UI.escapeHtml(u.name || "")}" data-role="${u.role}">✏️</button>
            </div>
          </td>
        </tr>
      `).join("");

      tbody.querySelectorAll(".reset-pw").forEach(btn => {
        btn.addEventListener("click", () => {
          UI.confirm(`Reset รหัสผ่านของ ${btn.dataset.id} ใช่ไหม?`, async () => {
            try {
              const res2 = await API.resetPassword(btn.dataset.id);
              UI.toast(`รหัสผ่านใหม่: ${res2.newPassword}`, "success");
            } catch {
              UI.toast("เกิดข้อผิดพลาด", "error");
            }
          });
        });
      });

      tbody.querySelectorAll(".edit-user").forEach(btn => {
        btn.addEventListener("click", () => {
          document.getElementById("user-modal-title").textContent = "✏️ แก้ไขผู้ใช้";
          document.getElementById("um-student-id").value = btn.dataset.id;
          document.getElementById("um-student-id").disabled = true;
          document.getElementById("um-name").value     = btn.dataset.name;
          document.getElementById("um-role").value     = btn.dataset.role;
          document.getElementById("um-password").value = "";
          UI.openModal("user-modal");
        });
      });

    } catch {
      tbody.innerHTML = `<tr><td colspan="5" class="text-secondary text-sm" style="text-align:center;padding:32px">โหลดข้อมูลไม่สำเร็จ</td></tr>`;
    }
  }

  document.getElementById("add-user-btn").addEventListener("click", () => {
    document.getElementById("user-modal-title").textContent = "➕ เพิ่มผู้ใช้";
    document.getElementById("um-student-id").disabled = false;
    document.getElementById("um-student-id").value = "";
    document.getElementById("um-name").value = "";
    document.getElementById("um-password").value = "";
    document.getElementById("um-role").value = "junior";
    UI.openModal("user-modal");
  });

  document.getElementById("user-submit-btn").addEventListener("click", async () => {
    const studentId = document.getElementById("um-student-id").value.trim();
    const name      = document.getElementById("um-name").value.trim();
    const password  = document.getElementById("um-password").value;
    const role      = document.getElementById("um-role").value;

    if (!studentId || !password) { UI.toast("กรุณากรอกข้อมูลให้ครบ", "warning"); return; }

    const btn = document.getElementById("user-submit-btn");
    UI.setLoading(btn, true);
    try {
      await API.setPassword(studentId, password, role);
      UI.toast("บันทึกสำเร็จ ✅", "success");
      UI.closeModal("user-modal");
      loadUsers();
    } catch {
      UI.toast("เกิดข้อผิดพลาด", "error");
    } finally {
      UI.setLoading(btn, false);
    }
  });

  // ── Announcements ─────────────────────────────
  async function loadAnnouncements() {
    const container = document.getElementById("announcements-list");
    container.innerHTML = `<div class="text-secondary text-sm">กำลังโหลด...</div>`;
    try {
      const res = await API.getAnnouncements();
      if (!res.success || !res.data?.length) {
        container.innerHTML = `<div class="text-secondary text-sm">ยังไม่มีประกาศ</div>`;
        return;
      }
      container.innerHTML = res.data.map(a => `
        <div class="announcement" style="margin-bottom:12px">
          <div class="announcement-icon">📢</div>
          <div style="flex:1">
            <div class="announcement-title">${UI.escapeHtml(a.title)}</div>
            <div class="announcement-body">${UI.escapeHtml(a.body)}</div>
            <div class="text-xs text-tertiary mt-1">${UI.formatDate(a.createdAt)}</div>
          </div>
          <button class="btn btn-danger btn-sm delete-ann" data-id="${a.id}">🗑️</button>
        </div>
      `).join("");

      container.querySelectorAll(".delete-ann").forEach(btn => {
        btn.addEventListener("click", () => {
          UI.confirm("ลบประกาศนี้ใช่ไหม?", async () => {
            await API.deleteAnnouncement(btn.dataset.id);
            UI.toast("ลบประกาศแล้ว", "success");
            loadAnnouncements();
          });
        });
      });
    } catch {
      container.innerHTML = `<div class="text-secondary text-sm">โหลดไม่สำเร็จ</div>`;
    }
  }

  document.getElementById("create-announcement-btn").addEventListener("click", () => {
    document.getElementById("ann-title").value = "";
    document.getElementById("ann-body").value  = "";
    UI.openModal("announce-modal");
  });

  document.getElementById("announce-submit-btn").addEventListener("click", async () => {
    const title = document.getElementById("ann-title").value.trim();
    const body  = document.getElementById("ann-body").value.trim();
    if (!title || !body) { UI.toast("กรุณากรอกข้อมูลให้ครบ", "warning"); return; }
    const btn = document.getElementById("announce-submit-btn");
    UI.setLoading(btn, true);
    try {
      await API.createAnnouncement({ title, body });
      UI.toast("สร้างประกาศแล้ว 📢", "success");
      UI.closeModal("announce-modal");
      loadAnnouncements();
    } catch {
      UI.toast("เกิดข้อผิดพลาด", "error");
    } finally {
      UI.setLoading(btn, false);
    }
  });

  // ── Analytics ─────────────────────────────────
  async function loadAnalytics() {
    const container = document.getElementById("analytics-content");
    container.innerHTML = `<div class="text-secondary text-sm">กำลังโหลด...</div>`;
    try {
      const res = await API.getAnalytics();
      if (!res.success) throw new Error();
      const d = res.data;

      container.innerHTML = `
        <div class="stats-grid" style="margin-bottom:20px">
          <div class="stat-card"><div class="stat-icon">📁</div><div class="stat-value">${d.totalFiles ?? "—"}</div><div class="stat-label">ไฟล์ทั้งหมด</div></div>
          <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-value">${d.totalUsers ?? "—"}</div><div class="stat-label">ผู้ใช้</div></div>
          <div class="stat-card"><div class="stat-icon">👁️</div><div class="stat-value">${d.totalViews ?? "—"}</div><div class="stat-label">การดู</div></div>
          <div class="stat-card"><div class="stat-icon">⬇️</div><div class="stat-value">${d.totalDownloads ?? "—"}</div><div class="stat-label">Downloads</div></div>
        </div>
        <div class="card p-4">
          <h3 class="font-semibold mb-4">ไฟล์ยอดนิยม 🏆</h3>
          ${(d.topFiles || []).map((f, i) => `
            <div class="flex items-center gap-3" style="padding:10px 0;border-bottom:1px solid var(--border)">
              <span class="font-bold text-secondary" style="width:24px">${i + 1}</span>
              <span class="text-sm" style="flex:1">${UI.escapeHtml(f.name)}</span>
              <span class="text-xs text-tertiary">${f.views} views</span>
            </div>
          `).join("") || '<div class="text-secondary text-sm">ยังไม่มีข้อมูล</div>'}
        </div>
      `;
    } catch {
      container.innerHTML = `<div class="text-secondary text-sm">โหลดไม่สำเร็จ</div>`;
    }
  }

  // ── Theme & Logout ────────────────────────────
  document.getElementById("theme-toggle").addEventListener("click", () => {
    UI.toggleTheme();
    document.getElementById("theme-toggle").textContent = UI.getTheme() === "dark" ? "☀️" : "🌙";
  });
  document.getElementById("theme-toggle").textContent = UI.getTheme() === "dark" ? "☀️" : "🌙";

  });

  // ── Boot ──────────────────────────────────────
  loadOverview();
})();
