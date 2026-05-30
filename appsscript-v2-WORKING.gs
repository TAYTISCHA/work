/**
 * =============================================
 * appsscript-v2.gs — Google Apps Script Backend (SIMPLIFIED)
 * คลังชีทเรียนสายรหัส | KMUTT CS Cheatsheet
 * ✅ Tested & Working Version
 * =============================================
 */

// ── CONFIG ──────────────────────────────────────
const CONFIG = {
  SHEET_ID:       "14qZOsrqHg4yVRDEFIXC8fsYJ3QvIn1SCy3xxMMD0tnk",
  DRIVE_FOLDER_ID: "1mt6hrJgSVnWmZmpmJ1cPtWSRmy49tKp7",
  PAGE_SIZE:      18,
};

// ── MAIN ENTRY POINTS ───────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    // Public action
    if (action === "login") {
      return respond(handleLogin(body));
    }

    // Protected actions
    const session = validateToken(body.token);
    if (!session) {
      return respond({ success: false, message: "Unauthorized" });
    }

    // Route actions
    switch(action) {
      case "logout":
        return respond(handleLogout(body));
      case "getFiles":
        return respond(handleGetFiles(body));
      case "getFolders":
        return respond(handleGetFolders());
      case "uploadFile":
        return respond(handleUploadFile(body));
      case "deleteFile":
        return respond(handleDeleteFile(body));
      case "renameFile":
        return respond(handleRenameFile(body));
      case "pinFile":
        return respond(handlePinFile(body));
      case "getUsers":
        return respond(handleGetUsers());
      case "setPassword":
        return respond(handleSetPassword(body));
      case "resetPassword":
        return respond(handleResetPassword(body));
      case "getAnnouncements":
        return respond(handleGetAnnouncements());
      case "createAnnouncement":
        return respond(handleCreateAnnouncement(body));
      case "deleteAnnouncement":
        return respond(handleDeleteAnnouncement(body));
      case "getAnalytics":
        return respond(handleGetAnalytics());
      case "logView":
        handleLogView(body);
        return respond({ success: true });
      default:
        return respond({ success: false, message: "Unknown action" });
    }
  } catch(err) {
    return respond({ success: false, message: err.toString() });
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const fileId = e.parameter.fileId;
    const token = e.parameter.token;

    if (action === "preview" && fileId) {
      const session = validateToken(token);
      if (!session) {
        return HtmlService.createHtmlOutput("Unauthorized");
      }

      const sheet = getSheet("files");
      const rows = sheet.getDataRange().getValues();
      const header = rows[0];
      const idIdx = getColumnIndex(header, "id");
      const driveIdx = getColumnIndex(header, "driveId");
      const dlIdx = getColumnIndex(header, "downloads");

      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIdx] === fileId) {
          const driveId = rows[i][driveIdx];
          const file = DriveApp.getFileById(driveId);
          sheet.getRange(i + 1, dlIdx + 1).setValue((rows[i][dlIdx] || 0) + 1);
          
          const blob = file.getBlob();
          return HtmlService.createHtmlOutput(
            `<iframe src="data:application/pdf;base64,${Utilities.base64Encode(blob.getBytes())}" 
             style="width:100%;height:100vh;border:none;"></iframe>`
          );
        }
      }
    }

    return HtmlService.createHtmlOutput("Not found");
  } catch(err) {
    return HtmlService.createHtmlOutput("Error: " + err.toString());
  }
}

// ── UTILITIES ───────────────────────────────────
function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = {
      users:         ["studentId","name","password","role","deviceId","createdAt"],
      files:         ["id","name","year","subject","category","driveId","size","pinned","createdAt","views","downloads"],
      logs:          ["studentId","fileId","type","timestamp"],
      announcements: ["id","title","body","createdAt"],
      tokens:        ["token","studentId","role","deviceId","expiresAt"],
    };
    if (headers[name]) {
      sheet.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]);
    }
  }
  return sheet;
}

function getColumnIndex(headers, colName) {
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] === colName) return i;
  }
  return -1;
}

function findRowByColumn(sheet, colName, value) {
  const rows = sheet.getDataRange().getValues();
  const colIdx = getColumnIndex(rows[0], colName);
  if (colIdx < 0) return -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][colIdx] === value) return i;
  }
  return -1;
}

function hashPassword(pwd) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pwd);
  return bytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0")).join("");
}

function generateToken() {
  return Utilities.getUuid().replace(/-/g, "") + Date.now().toString(36);
}

// ── AUTH ────────────────────────────────────────
function handleLogin(body) {
  const { studentId, password, deviceId } = body;
  if (!studentId || !password) {
    return { success: false, message: "Missing credentials" };
  }

  const sheet = getSheet("users");
  const rows = sheet.getDataRange().getValues();
  const header = rows[0];
  const sidIdx = getColumnIndex(header, "studentId");
  const pwIdx = getColumnIndex(header, "password");
  const nameIdx = getColumnIndex(header, "name");
  const roleIdx = getColumnIndex(header, "role");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][sidIdx] === studentId) {
      const inputHash = hashPassword(password);
      if (rows[i][pwIdx] !== inputHash) {
        return { success: false, message: "Invalid credentials" };
      }

      const token = generateToken();
      getSheet("tokens").appendRow([
        token, studentId, rows[i][roleIdx], deviceId, Date.now() + 8*60*60*1000
      ]);

      return {
        success: true,
        user: {
          id: studentId,
          studentId,
          name: rows[i][nameIdx] || studentId,
          role: rows[i][roleIdx],
        },
        token,
      };
    }
  }

  return { success: false, message: "User not found" };
}

function handleLogout(body) {
  const sheet = getSheet("tokens");
  const rows = sheet.getDataRange().getValues();
  const tokenIdx = getColumnIndex(rows[0], "token");
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][tokenIdx] === body.token) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return { success: true };
}

function validateToken(token) {
  if (!token) return null;
  const sheet = getSheet("tokens");
  const rows = sheet.getDataRange().getValues();
  const header = rows[0];
  const tokenIdx = getColumnIndex(header, "token");
  const studentIdx = getColumnIndex(header, "studentId");
  const roleIdx = getColumnIndex(header, "role");
  const expiresIdx = getColumnIndex(header, "expiresAt");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][tokenIdx] === token) {
      if (Date.now() > rows[i][expiresIdx]) {
        sheet.deleteRow(i + 1);
        return null;
      }
      return { studentId: rows[i][studentIdx], role: rows[i][roleIdx] };
    }
  }
  return null;
}

// ── FILES ───────────────────────────────────────
function handleGetFiles(body) {
  const { year, subject, category, search, page = 1, pageSize = CONFIG.PAGE_SIZE } = body;
  const sheet = getSheet("files");
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: true, data: [], totalPages: 0 };

  const header = rows[0];
  const yearIdx = getColumnIndex(header, "year");
  const catIdx = getColumnIndex(header, "category");
  const nameIdx = getColumnIndex(header, "name");
  const subIdx = getColumnIndex(header, "subject");
  const idIdx = getColumnIndex(header, "id");
  const sizeIdx = getColumnIndex(header, "size");
  const pinIdx = getColumnIndex(header, "pinned");
  const createdIdx = getColumnIndex(header, "createdAt");
  const viewsIdx = getColumnIndex(header, "views");

  let data = rows.slice(1).filter(row => {
    if (!row[idIdx]) return false;
    if (year && String(row[yearIdx]) !== String(year)) return false;
    if (category && row[catIdx] !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!String(row[nameIdx]).toLowerCase().includes(q) &&
          !String(row[subIdx]).toLowerCase().includes(q)) return false;
    }
    return true;
  }).map(row => ({
    id: row[idIdx],
    name: row[nameIdx],
    year: row[yearIdx],
    subject: row[subIdx],
    category: row[catIdx],
    size: row[sizeIdx],
    pinned: row[pinIdx] === true || row[pinIdx] === "TRUE",
    createdAt: row[createdIdx],
    views: row[viewsIdx] || 0,
  }));

  data.sort((a, b) => 
    (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || 
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  const totalPages = Math.ceil(data.length / pageSize);
  const paged = data.slice((page - 1) * pageSize, page * pageSize);

  return { success: true, data: paged, totalPages, total: data.length };
}

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

function handleUploadFile(body) {
  const { name, year, subject, category, base64 } = body;
  if (!name || !base64) return { success: false };

  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, "application/pdf", name + ".pdf");

  let folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  folder = getOrCreateFolder(folder, String(year));
  if (subject) folder = getOrCreateFolder(folder, subject);
  if (category) folder = getOrCreateFolder(folder, category);

  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const id = Utilities.getUuid();
  getSheet("files").appendRow([
    id, name, year, subject || "", category || "", file.getId(), blob.getBytes().length, 
    false, new Date().toISOString(), 0, 0
  ]);

  return { success: true, id };
}

function getOrCreateFolder(parent, name) {
  const iter = parent.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : parent.createFolder(name);
}

function handleDeleteFile(body) {
  const { fileId } = body;
  const sheet = getSheet("files");
  const rows = sheet.getDataRange().getValues();
  const header = rows[0];
  const idIdx = getColumnIndex(header, "id");
  const driveIdx = getColumnIndex(header, "driveId");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === fileId) {
      try { DriveApp.getFileById(rows[i][driveIdx]).setTrashed(true); } catch {}
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false };
}

function handleRenameFile(body) {
  const { fileId, newName } = body;
  const sheet = getSheet("files");
  const rows = sheet.getDataRange().getValues();
  const header = rows[0];
  const idIdx = getColumnIndex(header, "id");
  const nameIdx = getColumnIndex(header, "name");
  const driveIdx = getColumnIndex(header, "driveId");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === fileId) {
      sheet.getRange(i + 1, nameIdx + 1).setValue(newName);
      try { DriveApp.getFileById(rows[i][driveIdx]).setName(newName + ".pdf"); } catch {}
      return { success: true };
    }
  }
  return { success: false };
}

function handlePinFile(body) {
  const { fileId, pinned } = body;
  const sheet = getSheet("files");
  const rows = sheet.getDataRange().getValues();
  const header = rows[0];
  const idIdx = getColumnIndex(header, "id");
  const pinIdx = getColumnIndex(header, "pinned");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === fileId) {
      sheet.getRange(i + 1, pinIdx + 1).setValue(pinned);
      return { success: true };
    }
  }
  return { success: false };
}

// ── USERS ───────────────────────────────────────
function handleGetUsers() {
  const sheet = getSheet("users");
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: true, data: [] };
  const header = rows[0];
  const data = rows.slice(1).map(row => ({
    studentId: row[getColumnIndex(header, "studentId")],
    name: row[getColumnIndex(header, "name")],
    role: row[getColumnIndex(header, "role")],
    createdAt: row[getColumnIndex(header, "createdAt")],
  }));
  return { success: true, data };
}

function handleSetPassword(body) {
  const { studentId, newPassword, name, role } = body;
  if (!studentId || !newPassword) return { success: false };

  const sheet = getSheet("users");
  const rows = sheet.getDataRange().getValues();
  const header = rows[0];
  const sidIdx = getColumnIndex(header, "studentId");
  const pwIdx = getColumnIndex(header, "password");
  const nameIdx = getColumnIndex(header, "name");
  const roleIdx = getColumnIndex(header, "role");

  const hashed = hashPassword(newPassword);

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][sidIdx] === studentId) {
      sheet.getRange(i + 1, pwIdx + 1).setValue(hashed);
      if (role) sheet.getRange(i + 1, roleIdx + 1).setValue(role);
      return { success: true };
    }
  }

  sheet.appendRow([studentId, name || studentId, hashed, role || "junior", "", new Date().toISOString()]);
  return { success: true };
}

function handleResetPassword(body) {
  const { studentId } = body;
  const newPassword = generateRandomPassword();
  handleSetPassword({ studentId, newPassword });
  return { success: true, newPassword };
}

function generateRandomPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

// ── ANNOUNCEMENTS ───────────────────────────────
function handleGetAnnouncements() {
  const sheet = getSheet("announcements");
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: true, data: [] };
  const header = rows[0];
  const data = rows.slice(1).filter(r => r[0]).map(row => ({
    id: row[getColumnIndex(header, "id")],
    title: row[getColumnIndex(header, "title")],
    body: row[getColumnIndex(header, "body")],
    createdAt: row[getColumnIndex(header, "createdAt")],
  })).reverse();
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
  const sheet = getSheet("announcements");
  const rows = sheet.getDataRange().getValues();
  const header = rows[0];
  const idIdx = getColumnIndex(header, "id");
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false };
}

// ── ANALYTICS ───────────────────────────────────
function handleGetAnalytics() {
  const filesSheet = getSheet("files");
  const filesRows = filesSheet.getDataRange().getValues();
  const header = filesRows[0];
  const nameIdx = getColumnIndex(header, "name");
  const viewsIdx = getColumnIndex(header, "views");

  let totalFiles = filesRows.length - 1;
  let totalViews = 0;
  const topFiles = [];

  filesRows.slice(1).forEach(row => {
    const views = Number(row[viewsIdx]) || 0;
    totalViews += views;
    topFiles.push({ name: row[nameIdx], views });
  });

  topFiles.sort((a, b) => b.views - a.views);

  const usersSheet = getSheet("users");
  const totalUsers = Math.max(0, usersSheet.getLastRow() - 1);

  return {
    success: true,
    data: {
      totalFiles, totalUsers, totalViews, totalDownloads: totalViews,
      topFiles: topFiles.slice(0, 10),
      recentActivity: [],
    },
  };
}

// ── LOGGING ────────────────────────────────────
function handleLogView(body) {
  const { fileId, studentId } = body;
  if (!fileId) return;

  const sheet = getSheet("files");
  const rows = sheet.getDataRange().getValues();
  const header = rows[0];
  const idIdx = getColumnIndex(header, "id");
  const viewsIdx = getColumnIndex(header, "views");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === fileId) {
      sheet.getRange(i + 1, viewsIdx + 1).setValue((rows[i][viewsIdx] || 0) + 1);
      break;
    }
  }

  getSheet("logs").appendRow([studentId, fileId, "view", new Date().toISOString()]);
}
