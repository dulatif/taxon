export interface DocumentFile {
  id: string;
  projectId: string;
  name: string;
  size: string;
  type: 'image' | 'code' | 'pdf' | 'spreadsheet';
}

export interface VaultEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: VaultEntry[];
}
