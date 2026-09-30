import { Check, Columns2, FileText, Rows2, Save } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { DiffViewMode, FileDiffPayload } from './types';

interface DiffEditorPaneProps {
  payload: FileDiffPayload;
  viewMode: DiffViewMode;
  onViewModeChange: (mode: DiffViewMode) => void;
  workspacePath?: string;
  onSaveSuccess?: () => void;
}

interface DiffLine {
  type: 'added' | 'deleted' | 'unchanged';
  oldLineNumber?: number;
  newLineNumber?: number;
  text: string;
}

// Compute simple line-based diff for rendering
function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText ? oldText.split('\n') : [];
  const newLines = newText ? newText.split('\n') : [];

  // If one is empty
  if (oldLines.length === 0) {
    return newLines.map((line, idx) => ({
      type: 'added',
      newLineNumber: idx + 1,
      text: line,
    }));
  }
  if (newLines.length === 0) {
    return oldLines.map((line, idx) => ({
      type: 'deleted',
      oldLineNumber: idx + 1,
      text: line,
    }));
  }

  // Basic LCS or line comparison
  const diffLines: DiffLine[] = [];
  let o = 0;
  let n = 0;

  while (o < oldLines.length && n < newLines.length) {
    const oldLine = oldLines[o] ?? '';
    const newLine = newLines[n] ?? '';

    if (oldLine === newLine) {
      diffLines.push({
        type: 'unchanged',
        oldLineNumber: o + 1,
        newLineNumber: n + 1,
        text: oldLine,
      });
      o++;
      n++;
    } else {
      // Lookahead to see if line exists nearby in new
      const nextMatchInNew = newLines.slice(n, n + 8).indexOf(oldLine);
      const nextMatchInOld = oldLines.slice(o, o + 8).indexOf(newLine);

      if (nextMatchInNew !== -1 && (nextMatchInOld === -1 || nextMatchInNew <= nextMatchInOld)) {
        // Add all lines in new up to match
        for (let i = 0; i < nextMatchInNew; i++) {
          diffLines.push({
            type: 'added',
            newLineNumber: n + 1,
            text: newLines[n] ?? '',
          });
          n++;
        }
      } else if (nextMatchInOld !== -1) {
        // Delete lines in old up to match
        for (let i = 0; i < nextMatchInOld; i++) {
          diffLines.push({
            type: 'deleted',
            oldLineNumber: o + 1,
            text: oldLines[o] ?? '',
          });
          o++;
        }
      } else {
        // Different line, treat as replacement: deleted old, added new
        diffLines.push({
          type: 'deleted',
          oldLineNumber: o + 1,
          text: oldLine,
        });
        diffLines.push({
          type: 'added',
          newLineNumber: n + 1,
          text: newLine,
        });
        o++;
        n++;
      }
    }
  }

  while (o < oldLines.length) {
    diffLines.push({
      type: 'deleted',
      oldLineNumber: o + 1,
      text: oldLines[o] ?? '',
    });
    o++;
  }

  while (n < newLines.length) {
    diffLines.push({
      type: 'added',
      newLineNumber: n + 1,
      text: newLines[n] ?? '',
    });
    n++;
  }

  return diffLines;
}

export const DiffEditorPane: React.FC<DiffEditorPaneProps> = ({
  payload,
  viewMode,
  onViewModeChange,
  workspacePath,
  onSaveSuccess,
}) => {
  const [prevKey, setPrevKey] = useState(payload.filePath + '::' + payload.newContent);
  const [editedContent, setEditedContent] = useState(payload.newContent);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedBadge, setShowSavedBadge] = useState(false);

  const currentKey = payload.filePath + '::' + payload.newContent;
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    setEditedContent(payload.newContent);
    setIsDirty(false);
  }

  const diffLines = useMemo(() => {
    return computeLineDiff(payload.oldContent, editedContent);
  }, [payload.oldContent, editedContent]);

  const handleSave = async () => {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_remediated_file', {
        filePath: payload.filePath,
        content: editedContent,
        workspacePath: workspacePath || null,
      });
      setIsDirty(false);
      setShowSavedBadge(true);
      setTimeout(() => setShowSavedBadge(false), 2500);
      onSaveSuccess?.();
    } catch (err) {
      console.error('Failed to save remediated file:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (payload.isBinary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-text-muted bg-surface-primary/40 rounded-xl border border-border-primary/60 p-8">
        <FileText className="w-12 h-12 mb-3 text-text-muted/60" />
        <p className="text-sm font-semibold text-text-secondary">Binary file changed</p>
        <p className="text-xs text-text-muted mt-1">
          Diff preview is not available for binary assets.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] rounded-xl border border-border-primary/80 overflow-hidden font-mono text-xs">
      {/* Diff Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#050505] border-b border-border-primary/70">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold text-text-primary truncate" title={payload.filePath}>
            {payload.filePath}
          </span>
          {isDirty ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
              Unsaved Changes
            </span>
          ) : showSavedBadge ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Saved to disk
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-surface-primary p-0.5 rounded-lg border border-border-primary">
            <button
              type="button"
              onClick={() => onViewModeChange('unified')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'unified'
                  ? 'bg-blue-600/30 text-blue-300 font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Unified vertical diff"
            >
              <Rows2 className="w-3.5 h-3.5" />
              <span>Unified</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('split')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-blue-600/30 text-blue-300 font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Split side-by-side diff"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
          </div>

          {/* Save Button for Remediation */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-semibold transition-all cursor-pointer"
            title="Save inline edits directly to disk"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {viewMode === 'unified' ? (
        /* Unified View */
        <div className="flex-1 overflow-auto bg-[#030303] select-text">
          <table className="w-full border-collapse font-mono text-[11px] leading-relaxed">
            <tbody>
              {diffLines.map((line, idx) => {
                const isAdd = line.type === 'added';
                const isDel = line.type === 'deleted';
                return (
                  <tr
                    key={`uni-${idx}`}
                    className={`${
                      isAdd
                        ? 'bg-emerald-950/25 text-emerald-200'
                        : isDel
                          ? 'bg-rose-950/25 text-rose-200'
                          : 'text-text-secondary hover:bg-surface-primary/20'
                    }`}
                  >
                    <td className="w-12 text-right pr-2 select-none text-text-muted/50 border-r border-border-primary/30">
                      {line.oldLineNumber || ''}
                    </td>
                    <td className="w-12 text-right pr-2 select-none text-text-muted/50 border-r border-border-primary/30">
                      {line.newLineNumber || ''}
                    </td>
                    <td className="w-6 text-center select-none font-bold">
                      {isAdd ? '+' : isDel ? '-' : ' '}
                    </td>
                    <td className="pl-2 pr-4 whitespace-pre-wrap break-all">{line.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Side-by-Side Split View with Inline Remediation Buffer */
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Original Baseline */}
          <div className="w-1/2 border-r border-border-primary/80 flex flex-col bg-[#050505]">
            <div className="px-3 py-1 bg-[#090909] border-b border-border-primary/60 text-[10px] text-text-muted uppercase font-semibold flex items-center justify-between">
              <span>Original (Baseline)</span>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <pre className="text-[11px] leading-relaxed text-text-muted/80 whitespace-pre font-mono">
                {payload.oldContent || '(File did not exist at baseline)'}
              </pre>
            </div>
          </div>

          {/* Right: Modified & Inline Remediation Buffer */}
          <div className="w-1/2 flex flex-col bg-[#030303]">
            <div className="px-3 py-1 bg-[#090909] border-b border-border-primary/60 text-[10px] text-emerald-400 uppercase font-semibold flex items-center justify-between">
              <span>Modified Working Tree (Editable Buffer)</span>
              <span className="text-[9px] text-text-muted font-normal lowercase">
                click to edit inline
              </span>
            </div>
            <div className="flex-1 relative flex">
              <textarea
                value={editedContent}
                onChange={(e) => {
                  setEditedContent(e.target.value);
                  setIsDirty(true);
                }}
                onBlur={handleSave}
                placeholder="Empty file content"
                spellCheck={false}
                className="w-full h-full p-2 bg-transparent text-[11px] leading-relaxed text-text-primary font-mono resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/40"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
