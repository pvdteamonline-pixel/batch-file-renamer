import React from 'react';
import { useFileStore } from '../store/useFileStore';

export default function SettingsPanel() {
  const {
    currentDir,
    files,
    selectedPaths,
    autoNumbering,
    baseName,
    startNumber,
    padding,
    isLoading,
    isRenaming,
    canUndo,
    errorMessage,
    selectDirectory,
    setAutoNumbering,
    setBaseName,
    setStartNumber,
    setPadding,
    executeRename,
    undoLastBatch,
  } = useFileStore();

  const selectedCount = selectedPaths.size;
  const canRename = selectedCount > 0 && !isRenaming;

  return (
    <aside className="w-full md:w-80 shrink-0 border-r border-surface-border bg-white dark:bg-surface-darkAlt p-5 flex flex-col gap-6 overflow-y-auto">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Batch File Renamer
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          รีเนมไฟล์หลายไฟล์พร้อมกัน ทำงานแบบ Offline 100%
        </p>
      </div>

      {/* เลือกโฟลเดอร์ */}
      <section className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
          โฟลเดอร์
        </label>
        <button
          onClick={selectDirectory}
          disabled={isLoading}
          className="w-full px-3 py-2.5 rounded-xl2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium shadow-soft transition-colors"
        >
          {isLoading ? 'กำลังโหลด...' : 'เลือก Folder'}
        </button>
        {currentDir && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={currentDir}>
            {currentDir}
          </p>
        )}
        {files.length > 0 && (
          <p className="text-xs text-gray-400">
            พบ {files.length} ไฟล์ — เลือกแล้ว {selectedCount} ไฟล์
          </p>
        )}
      </section>

      <hr className="border-surface-border" />

      {/* โหมดรีเนม */}
      <section className="space-y-3">
        <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
          โหมดการรีเนม
        </label>

        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-sm text-gray-700 dark:text-gray-200">
            รันเลขอัตโนมัติ (Auto-Numbering)
          </span>
          <input
            type="checkbox"
            checked={autoNumbering}
            onChange={(e) => setAutoNumbering(e.target.checked)}
            className="w-4 h-4 accent-brand-600"
          />
        </label>

        {autoNumbering ? (
          <div className="space-y-3 pl-1">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">ชื่อหลัก (Base Name)</label>
              <input
                type="text"
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                placeholder="เช่น Photo_Trip"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-surface-border bg-gray-50 dark:bg-surface-dark text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">เริ่มที่เลข</label>
                <input
                  type="number"
                  min={0}
                  value={startNumber}
                  onChange={(e) => setStartNumber(parseInt(e.target.value, 10))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-surface-border bg-gray-50 dark:bg-surface-dark text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">จำนวนหลัก</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={padding}
                  onChange={(e) => setPadding(parseInt(e.target.value, 10))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-surface-border bg-gray-50 dark:bg-surface-dark text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              ตัวอย่าง: {baseName.trim() || 'File'}_{String(startNumber).padStart(padding, '0')}.jpg
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-400 pl-1">
            โหมด Manual: ลากสลับลำดับไฟล์ หรือพิมพ์ชื่อใหม่ในตารางด้านขวาได้โดยตรง
          </p>
        )}
      </section>

      <hr className="border-surface-border" />

      {/* Action */}
      <section className="space-y-2 mt-auto">
        {errorMessage && (
          <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
            {errorMessage}
          </div>
        )}
        <button
          onClick={executeRename}
          disabled={!canRename}
          className="w-full px-3 py-2.5 rounded-xl2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium shadow-soft transition-colors flex items-center justify-center gap-2"
        >
          {isRenaming && (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {isRenaming ? 'กำลังรีเนม...' : `รีเนมไฟล์ (${selectedCount})`}
        </button>
        <button
          onClick={undoLastBatch}
          disabled={!canUndo || isRenaming}
          className="w-full px-3 py-2 rounded-xl2 border border-surface-border text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-surface-dark disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          ↩ Undo การรีเนมล่าสุด
        </button>
      </section>
    </aside>
  );
}
