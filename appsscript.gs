/**
 * =============================================
 * appsscript.gs — Google Apps Script Backend
 * คลังชีทเรียนสายรหัส | KMUTT CS Cheatsheet
 * =============================================
 *
 * วิธีตั้งค่า:
 * 1. สร้าง Google Sheet ใหม่ และเปิด Apps Script (Extensions → Apps Script)
 * 2. วางโค้ดนี้ทั้งหมด
 * 3. แทนที่ค่า CONFIG ด้านล่างด้วยของจริง
 * 4. Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy URL ไปใส่ใน config.js (GAS_URL)
 *
 * โครงสร้าง Google Sheet:
 *   Sheet "users"  → studentId | name | password(bcrypt) | role | deviceId | createdAt
 *   Sheet "files"  → id | name | year | subject | category | driveId | size | pinned | createdAt | views | downloads
 *   Sheet "logs"   → studentId | fileId | type | timestamp
 *   Sheet "announcements" → id | title | body | createdAt
 *   Sheet "tokens" → token | studentId | deviceId | expiresAt
 */

// ── CONFIG ──────────────────────────────────────
const CONFIG = {
  SHEET_ID:       "YOUR_GOOGLE_SHEET_ID",
  DRIVE_FOLDER_ID: "YOUR_GOOGLE_DRIVE_ROOT_FOLDER_ID",
  PAGE_SIZE:      18,
  TOKEN_TTL:      8 * 60 * 60 * 1000,  // 8h in ms
  SALT_ROUNDS:    10,
};

// ── Entry Point ─────────────────────────────────
function doPost(e) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    // Public actions (no auth required)
    if (action === "login") return respond(handleLogin(body), headers);

    // Auth required for all other actions
    const session = validateToken(body.token, body.deviceId);
    if (!session) return respond({ success: false, message: "Unauthorized" }, headers);

    // Admin-only actions
    const adminActions = ["uploadFile","deleteFile","renameFile","pinFile","createFolder","setPassword","resetPassword","updateUserRole","createAnnouncement","deleteAnnouncement","getUsers"];
    if (adminActions.includes(action) && session.role !== "senior") {
      return respond({ success: false, message: "Forbidden" }, headers);
    }

    switch (action) {
      case "logout":             return respond(handleLogout(body, session), headers);
      case "getFiles":           return respond(handleGetFiles(body), headers);
      case "getFolders":         return respond(handleGetFolders(), headers);
      case "uploadFile":         return respond(handleUploadFile(body), headers);
      case "deleteFile":         return respond(handleDeleteFile(body), headers);
      case "renameFile":         return respond(handleRenameFile(body), headers);
      case "pinFile":            return respond(handlePinFile(body), headers);
      case "createFolder":       return respond(handleCreateFolder(body), headers);
      case "getUsers":           return respond(handleGetUsers(), headers);
      case "setPassword":        return respond(handleSetPassword(body), headers);
      case "resetPassword":      return respond(handleResetPassword(body), headers);
      case "updateUserRole":     return respond(handleUpdateUserRole(body), headers);
      case "getAnnouncements":   return respond(handleGetAnnouncements(), headers);
      case "createAnnouncement": return respond(handleCreateAnnouncement(body), headers);
      case "deleteAnnouncement": return respond(handleDeleteAnnouncement(body), headers);
      case "getAnalytics":       return respond(handleGetAnalytics(), headers);
      case "logView":            handleLogView(body, session); return respond({ success: true }, headers);
      default:                   return respond({ success: false, message: "Unknown action" }, headers);
    }
  } catch (err) {
    return respond({ success: false, message: err.message }, headers);
  }
}

// For PDF preview via GET
function doGet(e) {
  const params  = e.parameter;
  const action  = params.action;
  const fileId  = params.fileId;
  const token   = params.token;

  if (action === "preview" && fileId) {
    const session = validateToken(token, null, true); // deviceId optional for preview
    if (!session) return HtmlService.createHtmlOutput("<p>Unauthorized</p>");

    const sheet = getSheet("files");
    const rows  = sheet.getDataRange().getValues();
    const header = rows[0];
    const driveIdx = header.indexOf("driveId");
    const idIdx    = header.indexOf("id");

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idIdx] === fileId) {
        const driveId = rows[i][driveIdx];
        const file = DriveApp.getFileById(driveId);
        // Increment downloads
        const dlIdx = header.indexOf("downloads");
        sheet.getRange(i + 1, dlIdx + 1).setValue((rows[i][dlIdx] || 0) + 1);

        return ContentService.createTextOutput(file.getBlob().getDataAsString())
          .setMimeType(ContentService.MimeType.JSON);
        // For real PDF streaming, redirect to a temp share link:
        // return HtmlService.createHtmlOutputFromFile('redirect').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      }
    }
  }

  return HtmlService.createHtmlOutput("<p>Not found</p>");
}

// ── Helper: respond ──────────────────────────────
function respond(data, headers) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Helper: getSheet ─────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Create headers
    const headers = {
      users:         ["studentId","name","password","role","deviceId","createdAt"],
      files:         ["id","name","year","subject","category","driveId","size","pinned","createdAt","views","downloads"],
      logs:          ["studentId","fileId","type","timestamp"],
      announcements: ["id","title","body","createdAt"],
      tokens:        ["token","studentId","role","deviceId","expiresAt"],
    };
    if (headers[name]) sheet.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]);
  }
  return sheet;
}

// ── Token Management ─────────────────────────────
function generateToken() {
  return Utilities.getUuid().replace(/-/g, "") + Date.now().toString(36);
}

function storeToken(token, studentId, role, deviceId) {
  const sheet = getSheet("tokens");
  // Remove old tokens for this device
  const rows  = sheet.getDataRange().getValues();
  const header = rows[0];
  const deviceIdx = header.indexOf("deviceId");
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][deviceIdx] === deviceId) sheet.deleteRow(i + 1);
  }
  sheet.appendRow([token, studentId, role, deviceId, Date.now() + CONFIG.TOKEN_TTL]);
}

function validateToken(token, deviceId, skipDevice = false) {
  if (!token) return null;
  const sheet  = getSheet("tokens");
  const rows   = sheet.getDataRange().getValues();
  const header = rows[0];
  const tokenIdx  = header.indexOf("token");
  const studentIdx = header.indexOf("studentId");
  const roleIdx   = header.indexOf("role");
  const deviceIdx = header.indexOf("deviceId");
  const expiresIdx = header.indexOf("expiresAt");

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[tokenIdx] !== token) continue;
    if (!skipDevice && deviceId && row[deviceIdx] !== deviceId) return null;
    if (Date.now() > row[expiresIdx]) {
      sheet.deleteRow(i + 1);
      return null;
    }
    return { studentId: row[studentIdx], role: row[roleIdx] };
  }
  return null;
}

// ── HANDLER: Login ────────────────────────────────
function handleLogin(body) {
  const { studentId, password, deviceId } = body;
  if (!studentId || !password) return { success: false, message: "ข้อมูลไม่ครบ" };

  const sheet  = getSheet("users");
  const rows   = sheet.getDataRange().getValues();
  const header = rows[0];

  const sidIdx  = header.indexOf("studentId");
  const pwIdx   = header.indexOf("password");
  const nameIdx = header.indexOf("name");
  const roleIdx = header.indexOf("role");

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[sidIdx] !== studentId) continue;

    // Simple comparison (use bcrypt-like hashing in production)
    // For Apps Script, use Utilities.computeDigest for SHA-256
    const storedHash = row[pwIdx];
    const inputHash  = hashPassword(password);

    if (storedHash !== inputHash) {
      return { success: false, message: "รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง" };
    }

    const role  = row[roleIdx];
    const token = generateToken();
    storeToken(token, studentId, role, deviceId);

    return {
      success: true,
      user: {
        id: studentId,
        studentId,
        name: row[nameIdx] || studentId,
        role,
      },
      token,
    };
  }

  return { success: false, message: "ไม่พบรหัสนักศึกษานี้ในระบบ" };
}

// ── HANDLER: Logout ───────────────────────────────
function handleLogout(body, session) {
  const sheet  = getSheet("tokens");
  const rows   = sheet.getDataRange().getValues();
  const header = rows[0];
  const tokenIdx = header.indexOf("token");
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][tokenIdx] === body.token) { sheet.deleteRow(i + 1); break; }
  }
  return { success: true };
}

// ── HANDLER: Get Files ────────────────────────────
function handleGetFiles(body) {
  const { year, subject, category, search, page = 1, pageSize = CONFIG.PAGE_SIZE } = body;
  const sheet  = getSheet("files");
  const rows   = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: true, data: [], totalPages: 0 };

  const header   = rows[0];
  const yearIdx  = header.indexOf("year");
  const catIdx   = header.indexOf("category");
  const nameIdx  = header.indexOf("name");
  const subIdx   = header.indexOf("subject");
  const idIdx    = header.indexOf("id");
  const sizeIdx  = header.indexOf("size");
  const pinIdx   = header.indexOf("pinned");
  const createdIdx = header.indexOf("createdAt");
  const viewsIdx = header.indexOf("views");

  let data = rows.slice(1).filter(row => {
    if (!row[idIdx]) return false;
    if (year     && String(row[yearIdx])  !== String(year))  return false;
    if (category && row[catIdx]           !== category)       return false;
    if (search) {
      const q = search.toLowerCase();
      if (!row[nameIdx]?.toLowerCase().includes(q) &&
          !row[subIdx]?.toLowerCase().includes(q))  return false;
    }
    return true;
  }).map(row => ({
    id:        row[idIdx],
    name:      row[nameIdx],
    year:      row[yearIdx],
    subject:   row[subIdx],
    category:  row[catIdx],
    size:      row[sizeIdx],
    pinned:    row[pinIdx] === true || row[pinIdx] === "TRUE",
    createdAt: row[createdIdx],
    views:     row[viewsIdx] || 0,
  }));

  // Pinned first, then by date
  data.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.createdAt) - new Date(a.createdAt));

  const totalPages = Math.ceil(data.length / pageSize);
  const paged = data.slice((page - 1) * pageSize, page * pageSize);

  return { success: true, data: paged, totalPages, total: data.length };
}

// ── HANDLER: Get Folders ─────────────────────────
function handleGetFolders() {
  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const subs = [];
  const iter = folder.getFolders();
  while (iter.hasNext()) {
    const f = iter.next();
    subs.push({ id: f.getId(), name: f.getName() });
  }
  return { success: true, data: subs };
}

// ── HANDLER: Upload File ─────────────────────────
function handleUploadFile(body) {
  const { name, year, subject, category, base64, mimeType } = body;
  if (!name || !base64) return { success: false, message: "ข้อมูลไม่ครบ" };

  const bytes  = Utilities.base64Decode(base64);
  const blob   = Utilities.newBlob(bytes, mimeType || "application/pdf", name + ".pdf");

  // Navigate/create folder structure: root/year/subject/category
  let folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  folder = getOrCreateSubFolder(folder, String(year));
  if (subject) folder = getOrCreateSubFolder(folder, subject);
  if (category) folder = getOrCreateSubFolder(folder, category);

  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const id = Utilities.getUuid();
  getSheet("files").appendRow([id, name, year, subject || "", category || "", file.getId(), blob.getBytes().length, false, new Date().toISOString(), 0, 0]);

  return { success: true, id };
}

function getOrCreateSubFolder(parent, name) {
  const iter = parent.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : parent.createFolder(name);
}

// ── HANDLER: Delete File ─────────────────────────
function handleDeleteFile(body) {
  const { fileId } = body;
  const sheet  = getSheet("files");
  const rows   = sheet.getDataRange().getValues();
  const header = rows[0];
  const idIdx      = header.indexOf("id");
  const driveIdx   = header.indexOf("driveId");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === fileId) {
      try { DriveApp.getFileById(rows[i][driveIdx]).setTrashed(true); } catch {}
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: "ไม่พบไฟล์" };
}

// ── HANDLER: Rename File ─────────────────────────
function handleRenameFile(body) {
  const { fileId, newName } = body;
  const sheet  = getSheet("files");
  const rows   = sheet.getDataRange().getValues();
  const header = rows[0];
  const idIdx    = header.indexOf("id");
  const nameIdx  = header.indexOf("name");
  const driveIdx = header.indexOf("driveId");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === fileId) {
      sheet.getRange(i + 1, nameIdx + 1).setValue(newName);
      try { DriveApp.getFileById(rows[i][driveIdx]).setName(newName + ".pdf"); } catch {}
      return { success: true };
    }
  }
  return { success: false, message: "ไม่พบไฟล์" };
}

// ── HANDLER: Pin File ─────────────────────────────
function handlePinFile(body) {
  const { fileId, pinned } = body;
  const sheet  = getSheet("files");
  const rows   = sheet.getDataRange().getValues();
  const header = rows[0];
  const idIdx   = header.indexOf("id");
  const pinIdx  = header.indexOf("pinned");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === fileId) {
      sheet.getRange(i + 1, pinIdx + 1).setValue(pinned);
      return { success: true };
    }
  }
  return { success: false };
}

// ── HANDLER: Create Folder ────────────────────────
function handleCreateFolder(body) {
  const { name, parentId } = body;
  const parent = parentId ? DriveApp.getFolderById(parentId) : DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const folder = parent.createFolder(name);
  return { success: true, id: folder.getId() };
}

// ── HANDLER: Get Users ────────────────────────────
function handleGetUsers() {
  const sheet  = getSheet("users");
  const rows   = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: true, data: [] };
  const header = rows[0];
  const data = rows.slice(1).map(row => ({
    studentId: row[header.indexOf("studentId")],
    name:      row[header.indexOf("name")],
    role:      row[header.indexOf("role")],
    createdAt: row[header.indexOf("createdAt")],
  }));
  return { success: true, data };
}

// ── HANDLER: Set Password ─────────────────────────
function handleSetPassword(body) {
  const { studentId, newPassword, role } = body;
  if (!studentId || !newPassword) return { success: false, message: "ข้อมูลไม่ครบ" };

  const sheet  = getSheet("users");
  const rows   = sheet.getDataRange().getValues();
  const header = rows[0];
  const sidIdx  = header.indexOf("studentId");
  const pwIdx   = header.indexOf("password");
  const roleIdx = header.indexOf("role");

  const hashed = hashPassword(newPassword);

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][sidIdx] === studentId) {
      sheet.getRange(i + 1, pwIdx + 1).setValue(hashed);
      if (role) sheet.getRange(i + 1, roleIdx + 1).setValue(role);
      return { success: true };
    }
  }

  // New user
  sheet.appendRow([studentId, body.name || studentId, hashed, role || "junior", "", new Date().toISOString()]);
  return { success: true };
}

// ── HANDLER: Reset Password ───────────────────────
function handleResetPassword(body) {
  const { studentId } = body;
  const newPassword = generateRandomPassword();
  const res = handleSetPassword({ studentId, newPassword });
  if (res.success) return { success: true, newPassword };
  return res;
}

function generateRandomPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

// ── HANDLER: Update User Role ─────────────────────
function handleUpdateUserRole(body) {
  const { studentId, role } = body;
  const sheet  = getSheet("users");
  const rows   = sheet.getDataRange().getValues();
  const header = rows[0];
  const sidIdx  = header.indexOf("studentId");
  const roleIdx = header.indexOf("role");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][sidIdx] === studentId) {
      sheet.getRange(i + 1, roleIdx + 1).setValue(role);
      return { success: true };
    }
  }
  return { success: false };
}

// ── HANDLER: Announcements ────────────────────────
function handleGetAnnouncements() {
  const sheet  = getSheet("announcements");
  const rows   = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: true, data: [] };
  const header = rows[0];
  const data = rows.slice(1)
    .filter(r => r[header.indexOf("id")])
    .map(row => ({
      id:        row[header.indexOf("id")],
      title:     row[header.indexOf("title")],
      body:      row[header.indexOf("body")],
      createdAt: row[header.indexOf("createdAt")],
    }))
    .reverse(); // newest first
  return { success: true, data };
}

function handleCreateAnnouncement(body) {
  const { title, body: bodyText } = body;
  if (!title) return { success: false };
  const id = Utilities.getUuid();
  getSheet("announcements").appendRow([id, title, bodyText, new Date().toISOString()]);
  return { success: true };
}

function handleDeleteAnnouncement(body) {
  const { id } = body;
  const sheet  = getSheet("announcements");
  const rows   = sheet.getDataRange().getValues();
  const header = rows[0];
  const idIdx  = header.indexOf("id");
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === id) { sheet.deleteRow(i + 1); return { success: true }; }
  }
  return { success: false };
}

// ── HANDLER: Analytics ────────────────────────────
function handleGetAnalytics() {
  const filesSheet = getSheet("files");
  const filesRows  = filesSheet.getDataRange().getValues();
  const header     = filesRows[0];
  const nameIdx    = header.indexOf("name");
  const viewsIdx   = header.indexOf("views");
  const dlIdx      = header.indexOf("downloads");

  let totalFiles = filesRows.length - 1;
  let totalViews = 0, totalDownloads = 0;
  const topFiles = [];

  filesRows.slice(1).forEach(row => {
    const views = Number(row[viewsIdx]) || 0;
    const dl    = Number(row[dlIdx])    || 0;
    totalViews     += views;
    totalDownloads += dl;
    topFiles.push({ name: row[nameIdx], views });
  });

  topFiles.sort((a, b) => b.views - a.views);

  const usersSheet = getSheet("users");
  const totalUsers = Math.max(0, usersSheet.getLastRow() - 1);

  const logsSheet = getSheet("logs");
  const logsRows  = logsSheet.getDataRange().getValues();
  const logsHeader = logsRows[0];
  const recentActivity = logsRows.slice(1).reverse().slice(0, 10).map(row => ({
    studentId: row[logsHeader.indexOf("studentId")],
    fileId:    row[logsHeader.indexOf("fileId")],
    type:      row[logsHeader.indexOf("type")],
    at:        row[logsHeader.indexOf("timestamp")],
    fileName:  "—",
  }));

  return {
    success: true,
    data: {
      totalFiles, totalUsers, totalViews, totalDownloads,
      topFiles: topFiles.slice(0, 10),
      recentActivity,
    },
  };
}

// ── HANDLER: Log View ─────────────────────────────
function handleLogView(body, session) {
  const { fileId } = body;
  if (!fileId) return;

  // Increment view count in files sheet
  const sheet  = getSheet("files");
  const rows   = sheet.getDataRange().getValues();
  const header = rows[0];
  const idIdx    = header.indexOf("id");
  const viewsIdx = header.indexOf("views");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === fileId) {
      sheet.getRange(i + 1, viewsIdx + 1).setValue((rows[i][viewsIdx] || 0) + 1);
      break;
    }
  }

  // Append to logs
  getSheet("logs").appendRow([session.studentId, fileId, "view", new Date().toISOString()]);
}

// ── Utility: Hash Password ────────────────────────
function hashPassword(password) {
  // SHA-256 via Utilities (Apps Script built-in)
  const bytes  = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  return bytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0")).join("");
}
