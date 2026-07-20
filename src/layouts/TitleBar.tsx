import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';
export default function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="relative z-[9999] shrink-0 h-10 flex items-center justify-end select-none bg-surface-primary border-b border-border-primary w-full px-4"
    >
      {/* Title (Center) */}
      <div
        data-tauri-drag-region
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <span className="text-xs font-semibold text-text-muted">Taxon</span>
      </div>

      {/* macOS Traffic Lights (Right) */}
      <div className="flex items-center gap-2 z-10">
        <button
          onClick={() => getCurrentWindow().minimize()}
          className="w-4 h-4 rounded-full bg-[#FFBD2E] border border-[#DEA123] flex items-center justify-center group"
        >
          <Minus
            className="w-2 h-2 text-black opacity-0 group-hover:opacity-60 transition-opacity"
            strokeWidth={3}
          />
        </button>
        <button
          onClick={() => getCurrentWindow().toggleMaximize()}
          className="w-4 h-4 rounded-full bg-[#27C93F] border border-[#1AAB29] flex items-center justify-center group"
        >
          <Square
            className="w-2 h-2 text-black opacity-0 group-hover:opacity-60 transition-opacity"
            strokeWidth={3}
            fill="currentColor"
          />
        </button>
        <button
          onClick={() => getCurrentWindow().close()}
          className="w-4 h-4 rounded-full bg-[#FF5F56] border border-[#E0443E] flex items-center justify-center group"
        >
          <X
            className="w-2 h-2 text-black opacity-0 group-hover:opacity-60 transition-opacity"
            strokeWidth={3}
          />
        </button>
      </div>
    </div>
  );
}
