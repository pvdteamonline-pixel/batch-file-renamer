import { contextBridge, ipcRenderer } from 'electron';

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

const electronAPI = {
  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:selectDirectory'),

  listFiles: (
    dirPath: string
  ): Promise<{ success: boolean; files: FileEntry[]; error?: string }> =>
    ipcRenderer.invoke('fs:listFiles', dirPath),

  validateNames: (
    dirPath: string,
    plannedNames: { fullPath: string; newName: string }[]
  ): Promise<{ success: boolean; errors: Record<string, string> }> =>
    ipcRenderer.invoke('fs:validateNames', { dirPath, plannedNames }),

  renameFiles: (
    plan: RenamePlanItem[]
  ): Promise<{
    success: boolean;
    batchId: string | null;
    results: RenameResultItem[];
  }> => ipcRenderer.invoke('fs:renameFiles', plan),

  undoLastBatch: (): Promise<{
    success: boolean;
    error?: string;
    results?: RenameResultItem[];
  }> => ipcRenderer.invoke('fs:undoLastBatch'),

  getHistory: (limit?: number): Promise<HistoryRow[]> =>
    ipcRenderer.invoke('db:getHistory', limit),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
