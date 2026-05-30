# 📚 CheatVault — คลังชีทเรียนสายรหัส
### KMUTT · วิทยาการคอมพิวเตอร์

---

## 🗂️ โครงสร้างโปรเจกต์

```
cheatsheet-kmutt/
├── index.html            ← Redirect อัตโนมัติ
├── login.html            ← หน้าเข้าสู่ระบบ
├── dashboard.html        ← หน้าหลัก (Junior)
├── admin.html            ← Admin Dashboard (Senior)
├── vercel.json           ← Vercel routing config
├── public/
│   ├── css/
│   │   ├── style.css     ← Design System หลัก
│   │   ├── login.css     ← สไตล์หน้า Login
│   │   └── admin.css     ← สไตล์ Admin เพิ่มเติม
│   └── js/
│       ├── config.js     ← ค่าคงที่ทั้งหมด
│       ├── auth.js       ← ระบบ Login / Session
│       ├── drive.js      ← API Client → GAS
│       ├── ui.js         ← UI Utilities
│       ├── app.js        ← Bootstrap ร่วม
│       └── pages/
│           ├── login.js
│           ├── dashboard.js
│           └── admin.js
└── backend/
    └── appsscript.gs     ← Google Apps Script (วาง GAS)
```

---

## ⚙️ วิธีตั้งค่า (Step by Step)

### ขั้นที่ 1 — Google Sheet

1. สร้าง Google Sheet ใหม่
2. จด **Sheet ID** จาก URL: `https://docs.google.com/spreadsheets/d/**SHEET_ID**/edit`
3. Sheet จะสร้าง Tab อัตโนมัติตอน Deploy GAS ครั้งแรก

---

### ขั้นที่ 2 — Google Drive

1. สร้างโฟลเดอร์หลักใน Google Drive ชื่อ `CheatVault`
2. จด **Folder ID** จาก URL: `https://drive.google.com/drive/folders/**FOLDER_ID**`

---

### ขั้นที่ 3 — Google Apps Script

1. เปิด Google Sheet → Extensions → Apps Script
2. วางโค้ดจาก `backend/appsscript.gs` ทั้งหมด
3. แก้ไข CONFIG ด้านบนไฟล์:
```javascript
const CONFIG = {
  SHEET_ID:        "YOUR_GOOGLE_SHEET_ID",   // ← ใส่ของจริง
  DRIVE_FOLDER_ID: "YOUR_DRIVE_FOLDER_ID",   // ← ใส่ของจริง
};
```
4. คลิก **Deploy** → **New Deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. คลิก **Deploy** → Copy **Web App URL**

---

### ขั้นที่ 4 — แก้ config.js

เปิด `public/js/config.js` และแก้:
```javascript
GAS_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
```

---

### ขั้นที่ 5 — สร้าง Admin คนแรก

เปิด Google Sheet → Tab `users` → เพิ่มแถวแรกด้วยตนเอง:

| studentId | name | password (SHA-256) | role | deviceId | createdAt |
|---|---|---|---|---|---|
| 65090500001 | ชื่อรุ่นพี่ | `<hash>` | senior | | 2024-01-01 |

**วิธีได้ SHA-256 Hash ของ password:**
- เปิด GAS console แล้วรัน: `hashPassword("your_password")`
- หรือใช้เว็บ: [codebeautify.org/sha256-hash-generator](https://codebeautify.org/sha256-hash-generator)

---

### ขั้นที่ 6 — Deploy บน Vercel

```bash
# ติดตั้ง Vercel CLI
npm i -g vercel

# Deploy
cd cheatsheet-kmutt
vercel

# หรือ drag & drop โฟลเดอร์ที่ vercel.com
```

---

## 🔐 ระบบ Security

| Feature | รายละเอียด |
|---|---|
| Session | JWT-like token + Device fingerprint |
| Rate Limit | 5 ครั้ง / 15 นาที |
| Auto Logout | หลัง 8 ชั่วโมง |
| Role Guard | Senior / Junior แยก route |
| Password | SHA-256 hashed ฝั่ง GAS |
| Drive Link | ซ่อนอยู่หลัง GAS API (ไม่ expose ตรง) |

---

## 🎨 Features

### Junior (รุ่นน้อง)
- ✅ ดูไฟล์ / Preview PDF / Download
- ✅ ค้นหา + Filter ตามปี/วิชา/หมวดหมู่
- ✅ Bookmark ไฟล์
- ✅ Recently Viewed
- ✅ Dark Mode
- ✅ Mobile Responsive

### Senior (Admin)
- ✅ Upload PDF (Drag & Drop)
- ✅ ลบ / เปลี่ยนชื่อ / Pin ไฟล์
- ✅ จัดการผู้ใช้ + Reset Password
- ✅ สร้าง Announcement
- ✅ ดู Analytics

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML · CSS · Vanilla JS |
| Backend | Google Apps Script |
| Database | Google Sheets |
| Storage | Google Drive |
| Deploy | Vercel |

---

## 📞 ติดต่อ

พัฒนาโดย CSE Senior · KMUTT  
สอบถามผ่าน LINE Group คณะ 💬
