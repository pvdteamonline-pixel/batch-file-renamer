import React, { useEffect, useState } from 'react';
import SettingsPanel from './SettingsPanel';
import FileTable from './FileTable';
import { useFileStore } from '../store/useFileStore';

export default function Dashboard() {
  const [isDark, setIsDark] = useState(true);
  const lastResults = useFileStore((s) => s.lastResults);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDark]);

  const failedCount = lastResults?.filter((r) => !r.success).length ?? 0;
  const successCount = lastResults?.filter((r) => r.success).length ?? 0;

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-surface-dark">
      {/* Top bar */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-surface-border bg-white dark:bg-surface-darkAlt shrink-0">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
          Batch File Renamer
        </span>
        <button
          onClick={() => setIsDark((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg border border-surface-border text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-dark transition-colors"
        >
          {isDark ? '☀ Light Mode' : '🌙 Dark Mode'}
        </button>
      </header>

      {lastResults && (
        <div
          className={`px-4 py-2 text-xs ${
            failedCount > 0
              ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
              : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
          } border-b border-surface-border`}
        >
          เสร็จสิ้น: สำเร็จ {successCount} ไฟล์
          {failedCount > 0 ? ` · ล้มเหลว ${failedCount} ไฟล์ (ดูรายละเอียดที่คอลัมน์ Preview)` : ''}
        </div>
      )}

      {/* Body: ซ้ายตั้งค่า / ขวาตารางไฟล์ */}
      <div className="flex-1 flex overflow-hidden">
        <SettingsPanel />
        <main className="flex-1 flex flex-col overflow-hidden">
          <FileTable />
        </main>
      </div>
    </div>
  );
}
