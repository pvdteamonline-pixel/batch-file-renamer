# Batch File Renamer

แอป Desktop สำหรับรีเนมไฟล์หลายไฟล์พร้อมกัน ทำงานแบบ **Offline 100%**
สร้างด้วย Electron + React + TypeScript + Vite + Tailwind CSS + Zustand + better-sqlite3

## ฟีเจอร์
- เลือกโฟลเดอร์ → แสดงรายชื่อไฟล์ทั้งหมด (ชื่อ, นามสกุล, ขนาด, Preview ชื่อใหม่)
- เลือกไฟล์ทีละไฟล์ หรือ Select All
- โหมด **Auto-Numbering**: กรอกชื่อหลัก ระบบรันเลขให้อัตโนมัติ
- โหมด **Manual-Ordering**: ลากสลับลำดับไฟล์ (drag & drop) หรือพิมพ์ชื่อเอง
- Live Preview + Validation (กันชื่อซ้ำ/ตัวอักษรต้องห้าม) ก่อนรีเนมจริง
- บันทึก History ลง SQLite → กด **Undo** ย้อนกลับการรีเนมล่าสุดได้
- รองรับ Dark Mode

## โครงสร้างโปรเจกต์
```
batch-file-renamer/
├── electron/          # Main process + Preload (Node.js, fs-extra, better-sqlite3)
│   ├── main.ts
│   ├── preload.ts
│   └── db.ts
├── src/                # Renderer process (React)
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── FileTable.tsx
│   ├── store/useFileStore.ts   # Zustand store
│   ├── types/electron.d.ts     # window.electronAPI types
│   ├── App.tsx
│   └── main.tsx
├── build/license.txt   # ใช้โดย .pkg installer wizard
└── .github/workflows/build-mac.yml
```

## วิธีรันบนเครื่อง (Dev)
ต้องมี Node.js 20+ และเครื่อง macOS (เพราะ build เป็น .pkg ของ Mac)

```bash
npm install
npm run dev          # เปิด Vite dev server (terminal 1)
npm run build:electron && npx electron .   # เปิด Electron (terminal 2) — หรือใช้ npm run start หลัง build renderer แล้ว
```

วิธีที่ง่ายกว่าสำหรับทดสอบแบบ production build:
```bash
npm install
npm run build         # build renderer (Vite) + electron (tsc)
npx electron .         # เปิดแอป
```

## ผู้ใช้ปลายทางต้องลง Node.js เองไหม?
**ไม่ต้องครับ** Electron มี Node.js runtime ฝังอยู่ในตัวแอปอยู่แล้ว
ผู้ใช้ดับเบิลคลิกไฟล์ `.pkg` → ติดตั้งผ่าน wizard → เปิดแอปใช้ได้ทันที
ไม่ต้องเปิด Terminal ไม่ต้องรู้จัก Node/npm/JavaScript เลย เหมือนแอป Mac ทั่วไป 100%

จุดเดียวที่ต้องระวังคือ `better-sqlite3` เป็น native module (C++ compiled)
ต้อง build ให้ตรงกับชิป Mac ของผู้ใช้ (Intel `x64` / Apple Silicon `arm64`)
ซึ่ง config ใน `package.json` (`"arch": ["x64", "arm64"]`) และ
`electron-builder install-app-deps` (รันอัตโนมัติหลัง `npm install` ผ่าน postinstall)
จัดการ rebuild native module ให้ตรง Electron + ตรงชิปอัตโนมัติแล้ว
ผลคือจะได้ `.pkg` 2 ไฟล์ (x64 และ arm64) ให้เลือกแจกตามชิปเครื่องผู้ใช้

## Build เป็น .pkg installer (บนเครื่อง Mac โดยตรง)
```bash
npm install
npm run dist:mac
```
ไฟล์ผลลัพธ์จะอยู่ที่ `release/Batch File Renamer-<version>.pkg`

## Build ผ่าน GitHub Actions (ไม่ต้องมี Mac ก็ build ได้)
Workflow อยู่ที่ `.github/workflows/build-mac.yml` รันบน `macos-latest` runner

1. Push โค้ดนี้ขึ้น GitHub repository
2. ไปที่แท็บ **Actions** → workflow "Build macOS Installer (.pkg)" จะรันอัตโนมัติเมื่อ push ขึ้น `main`
   หรือกด **Run workflow** เพื่อรันด้วยตัวเอง (workflow_dispatch)
3. รอ build เสร็จ → ดาวน์โหลดไฟล์ `.pkg` ได้จากหน้า Artifacts ของ run นั้น
4. ถ้า push เป็น tag เช่น `v1.0.0` ไฟล์ `.pkg` จะถูกแนบเข้า GitHub Release ให้อัตโนมัติด้วย

### Code Signing (ทางเลือก แต่แนะนำสำหรับแจกจริง)
ถ้าไม่ sign แอป ผู้ใช้ที่ติดตั้งครั้งแรกจะต้องไปกด Allow เองที่
`System Settings > Privacy & Security` เนื่องจาก macOS Gatekeeper บล็อกแอปที่ไม่ได้ sign

ถ้ามี Apple Developer Program ($99/ปี) ให้เพิ่ม GitHub Secrets เหล่านี้ในหน้า
**Settings > Secrets and variables > Actions** ของ repo:

| Secret | คำอธิบาย |
|---|---|
| `MAC_CERT_P12_BASE64` | certificate (.p12) export แล้ว encode เป็น base64 |
| `MAC_CERT_PASSWORD` | password ของไฟล์ .p12 |
| `APPLE_ID` | Apple ID ที่ใช้ลงทะเบียน Developer Program |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password ของ Apple ID นั้น |
| `APPLE_TEAM_ID` | Team ID จาก developer.apple.com |

workflow จะ import certificate และ sign ให้อัตโนมัติ ถ้าไม่ตั้งค่า secrets เหล่านี้
build จะยังสำเร็จเป็น `.pkg` แบบ unsigned (ใช้งานได้ปกติ แค่ต้อง allow เองครั้งแรก)

## หมายเหตุด้านความปลอดภัย
- ใช้ Context Isolation + `contextBridge` (ไม่เปิด `nodeIntegration` ใน renderer)
- การเข้าถึง filesystem ทั้งหมดทำผ่าน IPC ใน `main.ts` เท่านั้น
- ตรวจสอบชื่อไฟล์ต้องห้าม (`\ / : * ? " < > |`) และชื่อซ้ำก่อนรีเนมจริงทุกครั้ง
