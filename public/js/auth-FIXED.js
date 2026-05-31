/**
 * =============================================
 * auth.js — Authentication & Session Manager
 * คลังชีทเรียนสายรหัส | KMUTT CS Cheatsheet
 * =============================================
 */

const Auth = (() => {
  // ── Device Fingerprint ──────────────────────
  function getDeviceId() {
    let id = localStorage.getItem(CONFIG.DEVICE_KEY);
    if (!id) {
      id = "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(CONFIG.DEVICE_KEY, id);
    }
    return id;
  }

  // ── Rate Limiting ───────────────────────────
  function checkRateLimit() {
    const raw = localStorage.getItem(CONFIG.RATE_LIMIT_KEY);
    const now = Date.now();
    let data = raw ? JSON.parse(raw) : { count: 0, start: now };
    if (now - data.start > CONFIG.RATE_LIMIT_WINDOW) data = { count: 0, start: now };
    if (data.count >= CONFIG.RATE_LIMIT_MAX) {
      const wait = Math.ceil((CONFIG.RATE_LIMIT_WINDOW - (now - data.start)) / 60000);
      return { blocked: true, wait };
    }
    data.count++;
    localStorage.setItem(CONFIG.RATE_LIMIT_KEY, JSON.stringify(data));
    return { blocked: false };
  }

  function resetRateLimit() {
    localStorage.removeItem(CONFIG.RATE_LIMIT_KEY);
  }

  // ── Session Management ──────────────────────
  // ✅ FIX: รับ gasToken จาก API response เสมอ ไม่สร้าง token เอง
  function createSession(user, gasToken) {
    const session = {
      userId:    user.id,
      studentId: user.studentId,
      name:      user.name,
      role:      user.role,
      deviceId:  getDeviceId(),
      createdAt: Date.now(),
      expiresAt: Date.now() + CONFIG.SESSION_DURATION,
      token:     gasToken,  // ✅ ใช้ token จาก GAS เท่านั้น
    };
    localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(session));
    return session;
  }

  // ✅ FIX: ดึง session (และ token) จาก localStorage ทุกครั้ง
  // ไม่ cache ในตัวแปร เพื่อให้ได้ค่าล่าสุดเสมอ
  function getSession() {
    const raw = localStorage.getItem(CONFIG.SESSION_KEY);
    if (!raw) return null;
    let session;
    try { session = JSON.parse(raw); } catch { return null; }

    if (Date.now() > session.expiresAt) {
      destroySession();
      return null;
    }
    if (session.deviceId !== getDeviceId()) {
      destroySession();
      return null;
    }
    return session;
  }

  function destroySession() {
    localStorage.removeItem(CONFIG.SESSION_KEY);
  }

  // ── Login ───────────────────────────────────
  async function login(studentId, password) {
    const rate = checkRateLimit();
    if (rate.blocked) throw new Error(`Too many attempts. Please wait ${rate.wait} minute(s).`);
    if (!studentId || !password) throw new Error("กรุณากรอกข้อมูลให้ครบ");
    if (!/^\d{8,11}$/.test(studentId.trim())) throw new Error("รหัสนักศึกษาไม่ถูกต้อง");

    const res = await API.call("login", {
      studentId: studentId.trim(),
      password,
      deviceId: getDeviceId(),
    });

    if (!res.success) throw new Error(res.message || "เข้าสู่ระบบไม่สำเร็จ");

    // ✅ FIX: ส่ง res.token (จาก GAS) เข้า createSession
    if (!res.token) throw new Error("ไม่ได้รับ token จากเซิร์ฟเวอร์");

    resetRateLimit();
    const session = createSession(res.user, res.token);
    return session;
  }

  // ── Logout ──────────────────────────────────
  async function logout() {
    const session = getSession();
    if (session) {
      // ✅ ดึง token ล่าสุดจาก getSession() ไม่ใช่ตัวแปรเก่า
      API.call("logout", { token: session.token }).catch(() => {});
    }
    destroySession();
    window.location.href = CONFIG.ROUTES.LOGIN;
  }

  // ── Route Guards ────────────────────────────
  function requireAuth() {
    const session = getSession();
    if (!session) {
      window.location.href = CONFIG.ROUTES.LOGIN;
      return null;
    }
    return session;
  }

  function requireAdmin() {
    const session = requireAuth();
    if (!session) return null;
    if (session.role !== CONFIG.ROLES.ADMIN) {
      window.location.href = CONFIG.ROUTES.DASHBOARD;
      return null;
    }
    return session;
  }

  function isAdmin(session) {
    return session?.role === CONFIG.ROLES.ADMIN;
  }

  // ── Auto Logout on Expiry ───────────────────
  function startAutoLogout() {
    const session = getSession();
    if (!session) return;
    const msLeft = session.expiresAt - Date.now();
    setTimeout(() => {
      UI.toast("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", "info");
      setTimeout(() => logout(), 2000);
    }, msLeft);
  }

  return {
    login,
    logout,
    getSession,
    destroySession,
    requireAuth,
    requireAdmin,
    isAdmin,
    startAutoLogout,
    getDeviceId,
  };
})();
