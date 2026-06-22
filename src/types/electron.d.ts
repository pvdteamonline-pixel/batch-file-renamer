export interface FileEntry {
  name: string;
  extension: string;
  size: number;
  fullPath: string;
  isDirectory: boolean;
}

export interface RenamePlanItem {
  fullPath: string;
  newFullPath: string;
}

export interface RenameResultItem {
  fullPath: string;
  success: boolean;
  error?: string;
}

export interface HistoryRow {
  id: number;
  batch_id: string;
  original_path: string;
  new_path: string;
  created_at: string;
  undone: number;
}

export interface ElectronAPI {
  selectDirectory: () => Promise<string | null>;
  listFiles: (
    dirPath: string
  ) => Promise<{ success: boolean; files: FileEntry[]; error?: string }>;
  validateNames: (
    dirPath: string,
    plannedNames: { fullPath: string; newName: string }[]
  ) => Promise<{ success: boolean; errors: Record<string, string> }>;
  renameFiles: (plan: RenamePlanItem[]) => Promise<{
    success: boolean;
    batchId: string | null;
    results: RenameResultItem[];
  }>;
  undoLastBatch: () => Promise<{
    success: boolean;
    error?: string;
    results?: RenameResultItem[];
  }>;
  getHistory: (limit?: number) => Promise<HistoryRow[]>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
