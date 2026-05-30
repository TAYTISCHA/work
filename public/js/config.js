/**
 * =============================================
 * config.js — Global Configuration
 * คลังชีทเรียนสายรหัส | KMUTT CS Cheatsheet
 * =============================================
 */

const CONFIG = {
  // ── App Info ──────────────────────────────
  APP_NAME: "CheatVault",
  APP_SUBTITLE: "คลังชีทเรียนสายรหัส",
  UNIVERSITY: "KMUTT · วิทยาการคอมพิวเตอร์",
  VERSION: "1.0.0",

  // ── Google Apps Script ────────────────────
  // TODO: แทนที่ด้วย Deployed GAS Web App URL ของคุณ
  GAS_URL: "https://script.google.com/macros/s/AKfycbyn3y2sdKuQZ43G7uK5NpZxTUDK659HTDuxk32h7clCBbzsxDLKABGqY9bcH2F9d0861Q/exec",

  // ── Session ───────────────────────────────
  SESSION_KEY: "cv_session",
  SESSION_DURATION: 8 * 60 * 60 * 1000,   // 8 ชั่วโมง (ms)
  DEVICE_KEY: "cv_device_id",
  RATE_LIMIT_KEY: "cv_rate_limit",
  RATE_LIMIT_MAX: 5,                        // ครั้ง
  RATE_LIMIT_WINDOW: 15 * 60 * 1000,       // 15 นาที (ms)

  // ── UI ────────────────────────────────────
  TOAST_DURATION: 3500,
  SKELETON_DELAY: 800,
  PAGE_SIZE: 18,                            // ไฟล์ต่อหน้า

  // ── Routes ────────────────────────────────
  ROUTES: {
    LOGIN: "/login.html",
    DASHBOARD: "/dashboard.html",
    ADMIN: "/admin.html",
    INDEX: "/index.html",
  },

  // ── Roles ─────────────────────────────────
  ROLES: {
    ADMIN: "senior",
    VIEWER: "junior",
  },

  // ── Theme ─────────────────────────────────
  THEME_KEY: "cv_theme",
  DEFAULT_THEME: "light",

  // ── Bookmarks ─────────────────────────────
  BOOKMARK_KEY: "cv_bookmarks",

  // ── Recently Viewed ───────────────────────
  RECENT_KEY: "cv_recent",
  RECENT_MAX: 20,

  // ── Accent Colors ─────────────────────────
  ACCENT: "#FF7A00",
};

// Lock config from accidental mutation
Object.freeze(CONFIG);
Object.freeze(CONFIG.ROUTES);
Object.freeze(CONFIG.ROLES);
