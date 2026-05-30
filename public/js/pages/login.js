/**
 * =============================================
 * pages/login.js — Login Page Logic
 * =============================================
 */

(function () {
  // ── Init ──────────────────────────────────
  UI.initTheme();

  // Redirect if already logged in
  const session = Auth.getSession();
  if (session) {
    window.location.href = Auth.isAdmin(session)
      ? CONFIG.ROUTES.ADMIN
      : CONFIG.ROUTES.DASHBOARD;
    return;
  }

  // ── Elements ──────────────────────────────
  const studentIdInput = document.getElementById("student-id");
  const passwordInput  = document.getElementById("password");
  const loginBtn       = document.getElementById("login-btn");
  const errorBox       = document.getElementById("login-error");
  const togglePw       = document.getElementById("toggle-pw");

  // ── Toggle Password Visibility ─────────────
  togglePw.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    togglePw.textContent = isHidden ? "🙈" : "👁️";
  });

  // ── Error Display ──────────────────────────
  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add("show");
    setTimeout(() => errorBox.classList.remove("show"), 5000);
  }

  // ── Login Handler ──────────────────────────
  async function handleLogin() {
    const studentId = studentIdInput.value.trim();
    const password  = passwordInput.value;

    errorBox.classList.remove("show");
    UI.setLoading(loginBtn, true);

    try {
      const session = await Auth.login(studentId, password);
      UI.toast("เข้าสู่ระบบสำเร็จ 🎉", "success");

      // Brief delay so toast is visible, then redirect
      setTimeout(() => {
        window.location.href = Auth.isAdmin(session)
          ? CONFIG.ROUTES.ADMIN
          : CONFIG.ROUTES.DASHBOARD;
      }, 600);
    } catch (err) {
      showError(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
      UI.setLoading(loginBtn, false);
      // Shake animation
      document.querySelector(".login-form-inner")?.classList.add("shake");
      setTimeout(() => document.querySelector(".login-form-inner")?.classList.remove("shake"), 500);
    }
  }

  // ── Event Listeners ────────────────────────
  loginBtn.addEventListener("click", handleLogin);

  // Enter key
  [studentIdInput, passwordInput].forEach(el => {
    el.addEventListener("keydown", e => {
      if (e.key === "Enter") handleLogin();
    });
  });

  // ── Auto-focus ─────────────────────────────
  studentIdInput.focus();
})();
