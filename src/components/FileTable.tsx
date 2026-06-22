import React, { useEffect, useMemo, useState } from 'react';
import { useFileStore } from '../store/useFileStore';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function FileTable() {
  const {
    files,
    order,
    selectedPaths,
    autoNumbering,
    manualNames,
    validation,
    isLoading,
    toggleSelectAll,
    toggleSelect,
    setManualName,
    reorder,
    computePreview,
    runValidation,
  } = useFileStore();

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileMap = useMemo(() => new Map(files.map((f) => [f.fullPath, f])), [files]);

  // คำนวณ preview ใหม่ทุกครั้งที่ dependency เปลี่ยน (Live Preview)
  const preview = useMemo(
    () => computePreview(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, order, selectedPaths, autoNumbering, manualNames]
  );

  // รัน validation อัตโนมัติเมื่อ preview เปลี่ยน (debounce เบาๆด้วย effect)
  useEffect(() => {
    const handle = setTimeout(() => {
      runValidation();
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  const allSelected = files.length > 0 && selectedPaths.size === files.length;
  const orderedFiles = order.map((p) => fileMap.get(p)).filter(Boolean) as typeof files;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        กำลังโหลดไฟล์...
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
        <p className="text-sm">ยังไม่ได้เลือกโฟลเดอร์ หรือโฟลเดอร์นี้ไม่มีไฟล์</p>
        <p className="text-xs">กดปุ่ม "เลือก Folder" ทางด้านซ้ายเพื่อเริ่มต้น</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-gray-50 dark:bg-surface-darkAlt z-10 border-b border-surface-border">
          <tr>
            <th className="w-10 px-3 py-2.5 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleSelectAll(e.target.checked)}
                className="w-4 h-4 accent-brand-600"
              />
            </th>
            {!autoNumbering && <th className="w-8 px-2 py-2.5" />}
            <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
              ชื่อเดิม
            </th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
              นามสกุล
            </th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
              ขนาด
            </th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
              ชื่อใหม่ (Preview)
            </th>
          </tr>
        </thead>
        <tbody>
          {orderedFiles.map((file, index) => {
            const isSelected = selectedPaths.has(file.fullPath);
            const error = validation.errors[file.fullPath];
            const newName = preview[file.fullPath];
            const isDragging = dragIndex === index;

            return (
              <tr
                key={file.fullPath}
                draggable={!autoNumbering}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => {
                  if (!autoNumbering) e.preventDefault();
                }}
                onDrop={() => {
                  if (dragIndex !== null && !autoNumbering) {
                    reorder(dragIndex, index);
                  }
                  setDragIndex(null);
                }}
                className={`border-b border-surface-border transition-colors ${
                  isSelected ? 'bg-brand-50/60 dark:bg-brand-900/20' : ''
                } ${isDragging ? 'opacity-40' : ''} ${error ? 'bg-red-50/60 dark:bg-red-950/20' : ''}`}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(file.fullPath)}
                    className="w-4 h-4 accent-brand-600"
                  />
                </td>
                {!autoNumbering && (
                  <td className="px-2 py-2 text-gray-400 drag-handle select-none">⠿</td>
                )}
                <td className="px-3 py-2 text-gray-800 dark:text-gray-200 truncate max-w-[220px]" title={file.name}>
                  {file.name}
                </td>
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                  {file.extension || '—'}
                </td>
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatBytes(file.size)}
                </td>
                <td className="px-3 py-2">
                  {autoNumbering || !isSelected ? (
                    <span
                      className={`font-medium ${
                        error
                          ? 'text-red-600'
                          : isSelected
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {newName}
                    </span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <input
                        type="text"
                        value={manualNames[file.fullPath] ?? file.name}
                        onChange={(e) => setManualName(file.fullPath, e.target.value)}
                        className={`px-2 py-1 rounded-md border text-sm bg-white dark:bg-surface-dark focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                          error ? 'border-red-400' : 'border-surface-border'
                        }`}
                      />
                    </div>
                  )}
                  {error && (
                    <p className="text-[11px] text-red-500 mt-0.5">{error}</p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
