import type { FileCategory } from "./utils/fileTypeDetector";

export { type FileCategory };

export interface FileInfo {
  id: string;
  path: string;
  name: string;
  extension: string;
  size: number;
  modified_at: string;
  file_type: string;
  opened_at: string;
}

export interface RecentFilesStore {
  files: FileInfo[];
  version: number;
}

export interface FileTabState {
  id: string;
  path: string;
  name: string;
  category: FileCategory;
  content: string | null;
  binaryData?: string;
  mimeType?: string;
  isDirty: boolean;
  isLoading: boolean;
  officeData?: any;
  error?: string;
}

