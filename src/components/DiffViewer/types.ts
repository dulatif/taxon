export interface FileDiffSummary {
  filePath: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

export interface FileDiffPayload {
  filePath: string;
  oldContent: string;
  newContent: string;
  additions: number;
  deletions: number;
  isBinary: boolean;
}

export type DiffViewMode = 'unified' | 'split';

export interface CategorizedDiffFiles {
  declared: FileDiffSummary[];
  collateral: FileDiffSummary[];
}

export function categorizeFiles(
  files: FileDiffSummary[],
  declaredOutputs: string[] = [],
): CategorizedDiffFiles {
  const normalizedOutputs = new Set(declaredOutputs.map((p) => p.trim().replace(/^\.?\/+/, '')));

  const declared: FileDiffSummary[] = [];
  const collateral: FileDiffSummary[] = [];

  for (const file of files) {
    const cleanPath = file.filePath.trim().replace(/^\.?\/+/, '');
    const isDeclared =
      normalizedOutputs.has(cleanPath) ||
      Array.from(normalizedOutputs).some(
        (out) => cleanPath.endsWith(out) || out.endsWith(cleanPath),
      );

    if (isDeclared) {
      declared.push(file);
    } else {
      collateral.push(file);
    }
  }

  return { declared, collateral };
}
