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

export interface ExcelSheetData {
  name: string;
  data: string[][];
}

export interface DocxOfficeData {
  type: "docx";
  html: string;
}

export interface ExcelOfficeData {
  type: "excel";
  sheets: ExcelSheetData[];
}

export interface PptxOfficeData {
  type: "pptx";
}

export type OfficeData = DocxOfficeData | ExcelOfficeData | PptxOfficeData;

export interface FileTabState {
  id: string;
  path: string;
  name: string;
  category: FileCategory;
  content: string | null;
  binaryData?: string;
  mediaUrl?: string;
  mimeType?: string;
  isDirty: boolean;
  isLoading: boolean;
  sourceFile?: FileInfo;
  officeData?: OfficeData;
  error?: string;
}
