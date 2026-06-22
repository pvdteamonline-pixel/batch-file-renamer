import { create } from 'zustand';
import type { FileEntry, RenameResultItem } from '../types/electron';

interface ValidationState {
  errors: Record<string, string>; // fullPath -> error message
}

interface FileStoreState {
  // ----- Data -----
  currentDir: string | null;
  files: FileEntry[];
  selectedPaths: Set<string>;
  order: string[]; // ลำดับ fullPath ปัจจุบัน (ใช้ทั้ง auto + manual)
  manualNames: Record<string, string>; // fullPath -> ชื่อใหม่ (ไม่รวมนามสกุล) สำหรับโหมด manual

  // ----- Rename config -----
  autoNumbering: boolean;
  baseName: string;
  startNumber: number;
  padding: number; // จำนวนหลักเลข เช่น 2 -> 01, 02

  // ----- UI / async state -----
  isLoading: boolean;
  isRenaming: boolean;
  errorMessage: string | null;
  validation: ValidationState;
  lastResults: RenameResultItem[] | null;
  canUndo: boolean;

  // ----- Actions -----
  selectDirectory: () => Promise<void>;
  loadFiles: (dirPath: string) => Promise<void>;
  toggleSelectAll: (checked: boolean) => void;
  toggleSelect: (fullPath: string) => void;
  setAutoNumbering: (value: boolean) => void;
  setBaseName: (value: string) => void;
  setStartNumber: (value: number) => void;
  setPadding: (value: number) => void;
  setManualName: (fullPath: string, value: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  computePreview: () => Record<string, string>; // fullPath -> ชื่อใหม่เต็ม (พร้อมนามสกุล)
  runValidation: () => Promise<boolean>;
  executeRename: () => Promise<void>;
  undoLastBatch: () => Promise<void>;
  reset: () => void;
}

function sanitizePaddedNumber(num: number, padding: number): string {
  return String(num).padStart(padding, '0');
}

export const useFileStore = create<FileStoreState>((set, get) => ({
  currentDir: null,
  files: [],
  selectedPaths: new Set(),
  order: [],
  manualNames: {},

  autoNumbering: true,
  baseName: '',
  startNumber: 1,
  padding: 2,

  isLoading: false,
  isRenaming: false,
  errorMessage: null,
  validation: { errors: {} },
  lastResults: null,
  canUndo: false,

  selectDirectory: async () => {
    const dir = await window.electronAPI.selectDirectory();
    if (!dir) return;
    await get().loadFiles(dir);
  },

  loadFiles: async (dirPath: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const res = await window.electronAPI.listFiles(dirPath);
      if (!res.success) {
        set({ errorMessage: res.error || 'ไม่สามารถอ่านโฟลเดอร์ได้', isLoading: false });
        return;
      }
      const order = res.files.map((f) => f.fullPath);
      set({
        currentDir: dirPath,
        files: res.files,
        order,
        selectedPaths: new Set(),
        manualNames: {},
        validation: { errors: {} },
        lastResults: null,
        isLoading: false,
      });
    } catch (err) {
      set({ errorMessage: (err as Error).message, isLoading: false });
    }
  },

  toggleSelectAll: (checked: boolean) => {
    const { files } = get();
    set({
      selectedPaths: checked ? new Set(files.map((f) => f.fullPath)) : new Set(),
    });
  },

  toggleSelect: (fullPath: string) => {
    const next = new Set(get().selectedPaths);
    if (next.has(fullPath)) next.delete(fullPath);
    else next.add(fullPath);
    set({ selectedPaths: next });
  },

  setAutoNumbering: (value: boolean) => set({ autoNumbering: value }),
  setBaseName: (value: string) => set({ baseName: value }),
  setStartNumber: (value: number) =>
    set({ startNumber: Number.isFinite(value) && value >= 0 ? value : 0 }),
  setPadding: (value: number) =>
    set({ padding: Number.isFinite(value) && value >= 1 ? value : 1 }),

  setManualName: (fullPath: string, value: string) => {
    set({ manualNames: { ...get().manualNames, [fullPath]: value } });
  },

  reorder: (fromIndex: number, toIndex: number) => {
    const order = [...get().order];
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= order.length ||
      toIndex >= order.length
    )
      return;
    const [moved] = order.splice(fromIndex, 1);
    order.splice(toIndex, 0, moved);
    set({ order });
  },

  computePreview: () => {
    const { files, order, selectedPaths, autoNumbering, baseName, startNumber, padding, manualNames } =
      get();
    const fileMap = new Map(files.map((f) => [f.fullPath, f]));
    const preview: Record<string, string> = {};

    // เฉพาะไฟล์ที่ถูกเลือก ตามลำดับใน `order`
    const selectedInOrder = order.filter((p) => selectedPaths.has(p));

    let counter = startNumber;
    for (const fullPath of selectedInOrder) {
      const file = fileMap.get(fullPath);
      if (!file) continue;

      if (autoNumbering) {
        const trimmedBase = baseName.trim();
        const namePart = trimmedBase.length > 0 ? trimmedBase : 'File';
        const numberStr = sanitizePaddedNumber(counter, padding);
        preview[fullPath] = `${namePart}_${numberStr}${file.extension}`;
        counter += 1;
      } else {
        const manual = manualNames[fullPath];
        const namePart = manual && manual.trim().length > 0 ? manual.trim() : file.name;
        preview[fullPath] = `${namePart}${file.extension}`;
      }
    }

    // ไฟล์ที่ไม่ได้เลือก -> ชื่อเดิม (ไม่เปลี่ยน)
    for (const file of files) {
      if (!preview[file.fullPath]) {
        preview[file.fullPath] = `${file.name}${file.extension}`;
      }
    }

    return preview;
  },

  runValidation: async () => {
    const { currentDir, selectedPaths, computePreview } = get();
    if (!currentDir) return false;
    const preview = computePreview();
    const plannedNames = Array.from(selectedPaths).map((fullPath) => ({
      fullPath,
      newName: preview[fullPath],
    }));

    if (plannedNames.length === 0) {
      set({ validation: { errors: {} } });
      return false;
    }

    const res = await window.electronAPI.validateNames(currentDir, plannedNames);
    set({ validation: { errors: res.errors } });
    return Object.keys(res.errors).length === 0;
  },

  executeRename: async () => {
    const { currentDir, files, selectedPaths, computePreview, runValidation } = get();
    if (!currentDir || selectedPaths.size === 0) return;

    set({ isRenaming: true, errorMessage: null });

    const isValid = await runValidation();
    if (!isValid) {
      set({ isRenaming: false });
      return;
    }

    const preview = computePreview();
    const fileMap = new Map(files.map((f) => [f.fullPath, f]));
    const plan = Array.from(selectedPaths).map((fullPath) => {
      const newName = preview[fullPath];
      const dirOfFile = fullPath.substring(0, fullPath.lastIndexOf('/'));
      return {
        fullPath,
        newFullPath: `${dirOfFile}/${newName}`,
      };
    });

    try {
      const result = await window.electronAPI.renameFiles(plan);
      set({
        lastResults: result.results,
        isRenaming: false,
        canUndo: !!result.batchId,
      });
      // โหลดรายชื่อไฟล์ใหม่หลัง rename สำเร็จ
      await get().loadFiles(currentDir);
    } catch (err) {
      set({ errorMessage: (err as Error).message, isRenaming: false });
    }
  },

  undoLastBatch: async () => {
    const { currentDir } = get();
    set({ isRenaming: true, errorMessage: null });
    try {
      const res = await window.electronAPI.undoLastBatch();
      if (!res.success) {
        set({ errorMessage: res.error || 'Undo ไม่สำเร็จ', isRenaming: false });
        return;
      }
      set({ lastResults: res.results || null, isRenaming: false, canUndo: false });
      if (currentDir) await get().loadFiles(currentDir);
    } catch (err) {
      set({ errorMessage: (err as Error).message, isRenaming: false });
    }
  },

  reset: () =>
    set({
      currentDir: null,
      files: [],
      selectedPaths: new Set(),
      order: [],
      manualNames: {},
      validation: { errors: {} },
      lastResults: null,
      errorMessage: null,
    }),
}));
