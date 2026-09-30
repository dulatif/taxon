import { AlertTriangle, ChevronDown, ChevronRight, FileCheck } from 'lucide-react';
import React, { useState } from 'react';
import { categorizeFiles, type FileDiffSummary } from './types';

export interface DiffFileTreeProps {
  files: FileDiffSummary[];
  declaredOutputs?: string[];
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
}

export const DiffFileTree: React.FC<DiffFileTreeProps> = ({
  files,
  declaredOutputs = [],
  selectedFile,
  onSelectFile,
}) => {
  const [declaredOpen, setDeclaredOpen] = useState(true);
  const [collateralOpen, setCollateralOpen] = useState(true);

  const { declared, collateral } = categorizeFiles(files, declaredOutputs);

  const renderBadge = (status: string) => {
    switch (status) {
      case 'added':
        return (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            A
          </span>
        );
      case 'deleted':
        return (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
            D
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            M
          </span>
        );
    }
  };

  const renderFileItem = (item: FileDiffSummary) => {
    const isSelected = selectedFile === item.filePath;
    return (
      <button
        key={item.filePath}
        type="button"
        onClick={() => onSelectFile(item.filePath)}
        className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
          isSelected
            ? 'bg-blue-600/20 text-blue-300 border border-blue-500/50 shadow-sm'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-primary/80 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {renderBadge(item.status)}
          <span className="truncate" title={item.filePath}>
            {item.filePath}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] shrink-0 font-mono">
          {item.additions > 0 && (
            <span className="text-emerald-400 font-semibold">+{item.additions}</span>
          )}
          {item.deletions > 0 && (
            <span className="text-rose-400 font-semibold">-{item.deletions}</span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Declared Deliverables Section */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setDeclaredOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono hover:bg-surface-secondary/50 rounded transition-colors"
        >
          <div className="flex items-center gap-1.5">
            {declaredOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>Declared Deliverables</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
            {declared.length}
          </span>
        </button>

        {declaredOpen && (
          <div className="space-y-1 pl-2">
            {declared.length > 0 ? (
              declared.map((file) => renderFileItem(file))
            ) : (
              <div className="text-[11px] text-text-muted italic px-3 py-2 bg-surface-primary/30 rounded border border-border-primary/40">
                No changed files match declared outputs.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collateral Changes Section */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setCollateralOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono hover:bg-surface-secondary/50 rounded transition-colors"
        >
          <div className="flex items-center gap-1.5">
            {collateralOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Collateral Changes (Outside Contract)</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300">
            {collateral.length}
          </span>
        </button>

        {collateralOpen && (
          <div className="space-y-1 pl-2">
            {collateral.length > 0 ? (
              collateral.map((file) => renderFileItem(file))
            ) : (
              <div className="text-[11px] text-text-muted italic px-3 py-2 bg-surface-primary/30 rounded border border-border-primary/40">
                No collateral changes detected outside contract.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
