import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import Database from 'better-sqlite3';

/**
 * RenameHistoryRow - แถวข้อมูล 1 รายการของ "batch การรีเนม" 1 ครั้ง
 * เก็บ original/new full path เพื่อให้ Undo ย้อนกลับได้ตรงไฟล์
 */
export interface RenameHistoryRow {
  id: number;
  batch_id: string;
  original_path: string;
  new_path: string;
  created_at: string;
  undone: number; // 0 = ยังไม่ undo, 1 = undo แล้ว
}

let db: Database.Database | null = null;

function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  return path.join(userDataPath, 'rename-history.sqlite3');
}

export function initDb(): Database.Database {
  if (db) return db;
  db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS rename_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT NOT NULL,
      original_path TEXT NOT NULL,
      new_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      undone INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_batch_id ON rename_history(batch_id);
  `);
  return db;
}

export function insertHistoryBatch(
  batchId: string,
  entries: { originalPath: string; newPath: string }[]
): void {
  const database = initDb();
  const insert = database.prepare(
    `INSERT INTO rename_history (batch_id, original_path, new_path) VALUES (?, ?, ?)`
  );
  const tx = database.transaction((rows: typeof entries) => {
    for (const row of rows) {
      insert.run(batchId, row.originalPath, row.newPath);
    }
  });
  tx(entries);
}

export function getLastBatchId(): string | null {
  const database = initDb();
  const row = database
    .prepare(
      `SELECT batch_id FROM rename_history WHERE undone = 0 ORDER BY id DESC LIMIT 1`
    )
    .get() as { batch_id: string } | undefined;
  return row ? row.batch_id : null;
}

export function getBatchEntries(batchId: string): RenameHistoryRow[] {
  const database = initDb();
  return database
    .prepare(
      `SELECT * FROM rename_history WHERE batch_id = ? AND undone = 0 ORDER BY id ASC`
    )
    .all(batchId) as RenameHistoryRow[];
}

export function markBatchUndone(batchId: string): void {
  const database = initDb();
  database
    .prepare(`UPDATE rename_history SET undone = 1 WHERE batch_id = ?`)
    .run(batchId);
}

export function getRecentHistory(limit = 50): RenameHistoryRow[] {
  const database = initDb();
  return database
    .prepare(`SELECT * FROM rename_history ORDER BY id DESC LIMIT ?`)
    .all(limit) as RenameHistoryRow[];
}
