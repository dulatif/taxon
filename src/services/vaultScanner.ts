import { exists, readDir, readTextFile, remove, writeTextFile } from '@tauri-apps/plugin-fs';
import type { VaultEntry } from '../types';

function joinPath(parent: string, child: string): string {
  const cleanedParent = parent.replace(/[/\\]+$/, '');
  return `${cleanedParent}/${child}`;
}

export async function scanVault(vaultPath: string): Promise<VaultEntry[]> {
  try {
    const entries = await readDir(vaultPath);
    const result: VaultEntry[] = [];

    for (const entry of entries) {
      // Ignore hidden files / directories (like .git, .obsidian, or .DS_Store)
      if (entry.name.startsWith('.')) continue;

      const fullPath = joinPath(vaultPath, entry.name);

      if (entry.isDirectory) {
        const children = await scanVault(fullPath);
        result.push({
          name: entry.name,
          path: fullPath,
          isDirectory: true,
          children,
        });
      } else {
        const lower = entry.name.toLowerCase();
        if (lower.endsWith('.md') || lower.endsWith('.txt') || lower.endsWith('.markdown')) {
          result.push({
            name: entry.name,
            path: fullPath,
            isDirectory: false,
          });
        }
      }
    }

    // Sort: directories first (alphabetically), then files (alphabetically)
    result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    return result;
  } catch (error) {
    console.error(`Failed to scan vault at ${vaultPath}:`, error);
    return [];
  }
}

export async function readDocument(filePath: string): Promise<string> {
  try {
    return await readTextFile(filePath);
  } catch (error) {
    console.error(`Failed to read document at ${filePath}:`, error);
    throw error;
  }
}

export async function writeDocument(filePath: string, content: string): Promise<void> {
  try {
    await writeTextFile(filePath, content);
  } catch (error) {
    console.error(`Failed to write document at ${filePath}:`, error);
    throw error;
  }
}

export async function deleteDocument(filePath: string): Promise<void> {
  try {
    await remove(filePath);
  } catch (error) {
    console.error(`Failed to delete document at ${filePath}:`, error);
    throw error;
  }
}

export async function createDocument(vaultPath: string, filename: string): Promise<string> {
  try {
    let cleanName = filename.trim();
    if (
      !cleanName.toLowerCase().endsWith('.md') &&
      !cleanName.toLowerCase().endsWith('.txt') &&
      !cleanName.toLowerCase().endsWith('.markdown')
    ) {
      cleanName += '.md';
    }

    const targetPath = joinPath(vaultPath, cleanName);
    const fileExists = await exists(targetPath).catch(() => false);

    if (fileExists) {
      throw new Error(`File "${cleanName}" already exists in this vault.`);
    }

    const title = cleanName.replace(/\.(md|txt|markdown)$/i, '');
    const initialContent = `# ${title}\n\n`;

    await writeTextFile(targetPath, initialContent);
    return targetPath;
  } catch (error: unknown) {
    console.error(`Failed to create document "${filename}" inside "${vaultPath}":`, error);
    throw new Error(
      (error as Error).message ||
        `Could not create document "${filename}". Please check file system permissions.`,
      { cause: error },
    );
  }
}
