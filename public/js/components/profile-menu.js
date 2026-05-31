/**
 * =============================================
 * components/profile-menu.js
 * Profile Dropdown with Logout
 * =============================================
 * ใส่ไว้ใน sidebar footer แทน logout button เดิม
 * ใช้ได้ทั้ง dashboard.html และ admin.html
 */

const ProfileMenu = (() => {
  let isOpen = false;

  function init(session) {
    const chip = document.getElementById("user-chip");
    if (!chip) return;

    // สร้าง dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "profile-dropdown";
    dropdown.id = "profile-dropdown";
    dropdown.innerHTML = `
      <div class="profile-dropdown-header">
        <div class="profile-dropdown-name">${UI.escapeHtml(session.name || session.studentId)}</div>
        <div class="profile-dropdown-id">${UI.escapeHtml(session.studentId)}</div>
      </div>
      <div class="profile-dropdown-item" id="pd-theme">
        <span>🌙</span>
        <span id="pd-theme-label">Dark Mode</span>
      </div>
      ${session.role === CONFIG.ROLES.ADMIN ? `
      <div class="profile-dropdown-item" id="pd-view-junior" onclick="window.open('${CONFIG.ROUTES.DASHBOARD}','_blank')">
        <span>👁️</span>
        <span>ดูเหมือนรุ่นน้อง</span>
      </div>` : ""}
      <div class="profile-dropdown-divider"></div>
      <div class="profile-dropdown-item danger" id="pd-logout">
        <span>↩</span>
        <span>ออกจากระบบ</span>
      </div>
    `;

    // ใส่ dropdown ก่อน chip
    chip.parentNode.insertBefore(dropdown, chip);

    // ลบ logout button เดิม (ถ้ามี)
    document.getElementById("logout-btn")?.remove();

    // Toggle dropdown เมื่อกด chip
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });

    // Theme toggle ใน dropdown
    document.getElementById("pd-theme")?.addEventListener("click", (e) => {
      e.stopPropagation();
      UI.toggleTheme();
      updateThemeLabel();
    });

    // Logout
    document.getElementById("pd-logout")?.addEventListener("click", (e) => {
      e.stopPropagation();
      close();
      UI.confirm("ต้องการออกจากระบบใช่ไหม?", () => Auth.logout());
    });

    // ปิดเมื่อกดที่อื่น
    document.addEventListener("click", () => close());

    // อัปเดต theme label
    updateThemeLabel();

    // อัปเดต theme icon ทุกครั้งที่ theme เปลี่ยน
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", updateThemeLabel);
    }
  }

  function updateThemeLabel() {
    const isDark = UI.getTheme() === "dark";
    const label = document.getElementById("pd-theme-label");
    const item = document.getElementById("pd-theme");
    if (label) label.textContent = isDark ? "Light Mode" : "Dark Mode";
    if (item) item.querySelector("span").textContent = isDark ? "☀️" : "🌙";
  }

  function toggle() {
    isOpen ? close() : open();
  }

  function open() {
    document.getElementById("profile-dropdown")?.classList.add("show");
    isOpen = true;
  }

  function close() {
    document.getElementById("profile-dropdown")?.classList.remove("show");
    isOpen = false;
  }

  return { init };
})();
