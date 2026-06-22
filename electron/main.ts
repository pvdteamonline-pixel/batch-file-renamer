import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { randomUUID } from 'crypto';
import {
  initDb,
  insertHistoryBatch,
  getLastBatchId,
  getBatchEntries,
  markBatchUndone,
  getRecentHistory,
} from './db';

const isDev = !app.isPackaged;

// ตัวอักษรต้องห้ามในชื่อไฟล์ (macOS / Windows / cross-platform safe)
const FORBIDDEN_CHARS_REGEX = /[\\/:*?"<>|]/;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  initDb();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------- Types shared with renderer (mirrored in src/types) ----------
interface FileEntry {
  name: string;
  extension: string;
  size: number;
  fullPath: string;
  isDirectory: boolean;
}

// ---------- IPC: เลือกโฟลเดอร์ ----------
ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// ---------- IPC: อ่านรายชื่อไฟล์ในโฟลเดอร์ ----------
ipcMain.handle('fs:listFiles', async (_event, dirPath: string) => {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const files: FileEntry[] = [];
    for (const item of items) {
      // แสดงเฉพาะไฟล์ ไม่รวม subdirectory เพื่อความปลอดภัยของ batch rename
      if (!item.isFile()) continue;
      const fullPath = path.join(dirPath, item.name);
      const stat = await fs.stat(fullPath);
      const ext = path.extname(item.name);
      files.push({
        name: path.basename(item.name, ext),
        extension: ext,
        size: stat.size,
        fullPath,
        isDirectory: false,
      });
    }
    return { success: true, files };
  } catch (err) {
    return { success: false, error: (err as Error).message, files: [] };
  }
});

// ---------- IPC: ตรวจสอบชื่อไฟล์ถูกต้อง/ไม่ซ้ำ ----------
ipcMain.handle(
  'fs:validateNames',
  async (
    _event,
    payload: { dirPath: string; plannedNames: { fullPath: string; newName: string }[] }
  ) => {
    const { dirPath, plannedNames } = payload;
    const errors: Record<string, string> = {};
    const seen = new Map<string, number>();

    // นับชื่อที่ชนกันเองในแผนการรีเนม
    for (const item of plannedNames) {
      const key = item.newName.toLowerCase();
      seen.set(key, (seen.get(key) || 0) + 1);
    }

    let existingFilesInDir: Set<string>;
    try {
      const dirItems = await fs.readdir(dirPath);
      existingFilesInDir = new Set(dirItems.map((f) => f.toLowerCase()));
    } catch {
      existingFilesInDir = new Set();
    }

    // ชุดชื่อเดิมของไฟล์ที่กำลังจะถูกแทนที่ (เพื่อไม่ให้ false positive กับตัวเอง)
    const originalNamesBeingRenamed = new Set(
      plannedNames.map((p) => path.basename(p.fullPath).toLowerCase())
    );

    for (const item of plannedNames) {
      const key = item.newName.toLowerCase();

      if (FORBIDDEN_CHARS_REGEX.test(item.newName)) {
        errors[item.fullPath] = 'มีตัวอักษรต้องห้าม: \\ / : * ? " < > |';
        continue;
      }
      if (item.newName.trim().length === 0) {
        errors[item.fullPath] = 'ชื่อไฟล์ว่างเปล่า';
        continue;
      }
      if ((seen.get(key) || 0) > 1) {
        errors[item.fullPath] = 'ชื่อไฟล์ซ้ำกับไฟล์อื่นในแผนการรีเนมนี้';
        continue;
      }
      if (
        existingFilesInDir.has(key) &&
        !originalNamesBeingRenamed.has(key)
      ) {
        errors[item.fullPath] = 'ชื่อไฟล์ซ้ำกับไฟล์ที่มีอยู่แล้วในโฟลเดอร์';
        continue;
      }
    }

    return { success: true, errors };
  }
);

// ---------- IPC: รีเนมไฟล์จริง (พร้อมบันทึก History) ----------
ipcMain.handle(
  'fs:renameFiles',
  async (
    _event,
    plan: { fullPath: string; newFullPath: string }[]
  ) => {
    const batchId = randomUUID();
    const results: { fullPath: string; success: boolean; error?: string }[] = [];
    const successfulEntries: { originalPath: string; newPath: string }[] = [];

    for (const item of plan) {
      try {
        // กันชื่อชนกับไฟล์ที่มีอยู่จริง ณ เวลาที่ rename (race condition)
        const exists = await fs.pathExists(item.newFullPath);
        if (exists && item.newFullPath !== item.fullPath) {
          throw new Error('ชื่อไฟล์ปลายทางมีอยู่แล้ว');
        }
        await fs.rename(item.fullPath, item.newFullPath);
        results.push({ fullPath: item.fullPath, success: true });
        successfulEntries.push({
          originalPath: item.fullPath,
          newPath: item.newFullPath,
        });
      } catch (err) {
        results.push({
          fullPath: item.fullPath,
          success: false,
          error: (err as Error).message,
        });
      }
    }

    if (successfulEntries.length > 0) {
      insertHistoryBatch(batchId, successfulEntries);
    }

    return {
      success: true,
      batchId: successfulEntries.length > 0 ? batchId : null,
      results,
    };
  }
);

// ---------- IPC: Undo การรีเนมล่าสุด ----------
ipcMain.handle('fs:undoLastBatch', async () => {
  const batchId = getLastBatchId();
  if (!batchId) {
    return { success: false, error: 'ไม่มีรายการให้ Undo' };
  }
  const entries = getBatchEntries(batchId);
  const results: { fullPath: string; success: boolean; error?: string }[] = [];

  for (const entry of entries) {
    try {
      const exists = await fs.pathExists(entry.new_path);
      if (!exists) throw new Error('ไม่พบไฟล์ปลายทาง อาจถูกย้าย/ลบไปแล้ว');
      const targetExists = await fs.pathExists(entry.original_path);
      if (targetExists) throw new Error('ชื่อเดิมถูกใช้งานแล้ว ไม่สามารถ Undo ได้');
      await fs.rename(entry.new_path, entry.original_path);
      results.push({ fullPath: entry.new_path, success: true });
    } catch (err) {
      results.push({
        fullPath: entry.new_path,
        success: false,
        error: (err as Error).message,
      });
    }
  }

  markBatchUndone(batchId);
  return { success: true, results };
});

// ---------- IPC: ดู History ----------
ipcMain.handle('db:getHistory', async (_event, limit?: number) => {
  return getRecentHistory(limit ?? 50);
});
