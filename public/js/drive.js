/**
 * =============================================
 * drive.js — Google Apps Script API Client
 * คลังชีทเรียนสายรหัส | KMUTT CS Cheatsheet
 * =============================================
 */

const API = (() => {
  // ── Core Fetch ──────────────────────────────
  async function call(action, params = {}) {
    const session = Auth.getSession();
    const payload = {
      action,
      ...params,
      token: session?.token || null,
      deviceId: Auth.getDeviceId(),
    };

    try {
      const res = await fetch(CONFIG.GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("[API Error]", action, err);
      throw err;
    }
  }

  // ── File Operations ─────────────────────────
  async function getFiles({ year, subject, category, search, page = 1 } = {}) {
    return call("getFiles", { year, subject, category, search, page, pageSize: CONFIG.PAGE_SIZE });
  }

  async function getFolders() {
    return call("getFolders");
  }

  async function uploadFile(fileData) {
    return call("uploadFile", fileData);
  }

  async function deleteFile(fileId) {
    return call("deleteFile", { fileId });
  }

  async function renameFile(fileId, newName) {
    return call("renameFile", { fileId, newName });
  }

  async function pinFile(fileId, pinned) {
    return call("pinFile", { fileId, pinned });
  }

  async function createFolder(name, parentId) {
    return call("createFolder", { name, parentId });
  }

  // ── User Management ─────────────────────────
  async function getUsers() {
    return call("getUsers");
  }

  async function setPassword(studentId, newPassword, role) {
    return call("setPassword", { studentId, newPassword, role });
  }

  async function resetPassword(studentId) {
    return call("resetPassword", { studentId });
  }

  async function updateUserRole(studentId, role) {
    return call("updateUserRole", { studentId, role });
  }

  // ── Announcements ───────────────────────────
  async function getAnnouncements() {
    return call("getAnnouncements");
  }

  async function createAnnouncement(data) {
    return call("createAnnouncement", data);
  }

  async function deleteAnnouncement(id) {
    return call("deleteAnnouncement", { id });
  }

  // ── Analytics ───────────────────────────────
  async function getAnalytics() {
    return call("getAnalytics");
  }

  async function logView(fileId) {
    const session = Auth.getSession();
    if (!session) return;
    return call("logView", { fileId, studentId: session.studentId });
  }

  // ── File Preview URL (hidden, proxied via GAS) ──
  function getPreviewUrl(fileId) {
    // GAS will validate token server-side and proxy the file
    const session = Auth.getSession();
    const params = new URLSearchParams({
      action: "preview",
      fileId,
      token: session?.token || "",
    });
    return `${CONFIG.GAS_URL}?${params}`;
  }

  return {
    call,
    getFiles,
    getFolders,
    uploadFile,
    deleteFile,
    renameFile,
    pinFile,
    createFolder,
    getUsers,
    setPassword,
    resetPassword,
    updateUserRole,
    getAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
    getAnalytics,
    logView,
    getPreviewUrl,
  };
})();
