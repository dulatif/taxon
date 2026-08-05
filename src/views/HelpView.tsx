import { Command, HelpCircle, Keyboard, Layers, Sparkles } from 'lucide-react';

export default function HelpView() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-6">
      {/* Header Info Box */}
      <div className="bg-surface-secondary border border-border-primary rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-text-primary" />
            Help &amp; Support Desk
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Documentation, keyboard shortcuts cheatsheet, and platform guidelines.
          </p>
        </div>

        <p className="text-xs leading-relaxed text-text-muted">
          Welcome to <strong>Taxon - Precision Tasking</strong>. Built with dark-mode aesthetic guidelines to facilitate absolute visual focus, OLED efficiency, and high-productivity daily workflows.
        </p>
      </div>

      {/* Global & Navigation Keyboard Shortcuts Cheatsheet */}
      <div className="bg-surface-secondary border border-border-primary rounded-xl p-6 space-y-4">
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono flex items-center gap-2 border-b border-border-primary/60 pb-3">
          <Keyboard className="w-4 h-4 text-emerald-400" />
          Keyboard Shortcuts Cheatsheet
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
          {/* Global Shortcuts */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
              Global Hotkeys
            </div>
            <div className="flex justify-between items-center bg-surface-primary p-2.5 rounded-lg border border-border-primary/50">
              <span className="text-text-primary font-sans text-xs">Command Palette</span>
              <kbd className="px-2 py-1 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">
                ⌘K / Ctrl+K
              </kbd>
            </div>
            <div className="flex justify-between items-center bg-surface-primary p-2.5 rounded-lg border border-border-primary/50">
              <span className="text-text-primary font-sans text-xs">Quick Add Task</span>
              <kbd className="px-2 py-1 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">
                ⌘N / Ctrl+N
              </kbd>
            </div>
            <div className="flex justify-between items-center bg-surface-primary p-2.5 rounded-lg border border-border-primary/50">
              <span className="text-text-primary font-sans text-xs">Launch Focus Mode</span>
              <kbd className="px-2 py-1 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">
                ⌘F / Ctrl+F
              </kbd>
            </div>
            <div className="flex justify-between items-center bg-surface-primary p-2.5 rounded-lg border border-border-primary/50">
              <span className="text-text-primary font-sans text-xs">Close Modals / Minimize Focus</span>
              <kbd className="px-2 py-1 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">
                Esc
              </kbd>
            </div>
            <div className="flex justify-between items-center bg-surface-primary p-2.5 rounded-lg border border-border-primary/50">
              <span className="text-text-primary font-sans text-xs">Start / Pause Focus Timer</span>
              <kbd className="px-2 py-1 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">
                ⌘⇧P / Ctrl+Shift+P
              </kbd>
            </div>
            <div className="flex justify-between items-center bg-surface-primary p-2.5 rounded-lg border border-border-primary/50">
              <span className="text-text-primary font-sans text-xs">Stop Focus Timer</span>
              <kbd className="px-2 py-1 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">
                ⌘⇧S / Ctrl+Shift+S
              </kbd>
            </div>
          </div>

          {/* Project Detail View Shortcuts */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
              Project Detail View Hotkeys
            </div>
            <div className="flex justify-between items-center bg-surface-primary p-2.5 rounded-lg border border-border-primary/50">
              <span className="text-text-primary font-sans text-xs">Focus Add Task Input</span>
              <kbd className="px-2 py-1 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">
                /
              </kbd>
            </div>
            <div className="flex justify-between items-center bg-surface-primary p-2.5 rounded-lg border border-border-primary/50">
              <span className="text-text-primary font-sans text-xs">Switch View Mode</span>
              <span className="flex gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">1 List</kbd>
                <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">2 Board</kbd>
                <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">3 Graph</kbd>
              </span>
            </div>
            <div className="flex justify-between items-center bg-surface-primary p-2.5 rounded-lg border border-border-primary/50">
              <span className="text-text-primary font-sans text-xs">Toggle Sidebar (Vault/Agent)</span>
              <span className="flex gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">[</kbd>
                <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">]</kbd>
              </span>
            </div>
            <div className="flex justify-between items-center bg-surface-primary p-2.5 rounded-lg border border-border-primary/50">
              <span className="text-text-primary font-sans text-xs">Cycle Sprint Filter</span>
              <kbd className="px-2 py-1 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">
                S / Alt+S
              </kbd>
            </div>
            <div className="flex justify-between items-center bg-surface-primary p-2.5 rounded-lg border border-border-primary/50">
              <span className="text-text-primary font-sans text-xs">AI Sync Export / Import / Copy</span>
              <span className="flex gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">Alt+E</kbd>
                <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">Alt+I</kbd>
                <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">Alt+C</kbd>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Command Palette Shortcuts & Search Navigation */}
      <div className="bg-surface-secondary border border-border-primary rounded-xl p-6 space-y-4">
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono flex items-center gap-2 border-b border-border-primary/60 pb-3">
          <Command className="w-4 h-4 text-blue-400" />
          Command Palette Shortcuts &amp; Search Guide (⌘K)
        </h3>

        <div className="space-y-4 text-xs">
          {/* Modal Navigation */}
          <div>
            <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-mono mb-2">
              Inside Palette Controls
            </div>
            <div className="grid grid-cols-3 gap-3 font-mono">
              <div className="bg-surface-primary p-2.5 rounded-lg border border-border-primary/50 flex items-center justify-between">
                <span>Navigate Results</span>
                <kbd className="px-2 py-0.5 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">↑ / ↓</kbd>
              </div>
              <div className="bg-surface-primary p-2.5 rounded-lg border border-border-primary/50 flex items-center justify-between">
                <span>Execute Selection</span>
                <kbd className="px-2 py-0.5 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">↵ Enter</kbd>
              </div>
              <div className="bg-surface-primary p-2.5 rounded-lg border border-border-primary/50 flex items-center justify-between">
                <span>Dismiss Modal</span>
                <kbd className="px-2 py-0.5 bg-surface-elevated border border-border-primary rounded text-[10px] text-text-primary">ESC</kbd>
              </div>
            </div>
          </div>

          {/* Special Search Queries */}
          <div>
            <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-mono mb-2">
              Special Search Commands &amp; Filters
            </div>
            <div className="space-y-2 font-mono">
              <div className="bg-surface-primary p-3 rounded-lg border border-border-primary/50 flex items-center justify-between">
                <div>
                  <div className="text-text-primary font-semibold font-sans">Sprint &amp; Backlog Direct Search</div>
                  <div className="text-[11px] text-text-muted font-mono mt-0.5">
                    Type <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-blue-400">Project Backlog</code> or <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-blue-400">Project Sprint 5</code> to jump directly to pre-filtered project view.
                  </div>
                </div>
                <Layers className="w-4 h-4 text-blue-400 shrink-0 ml-2" />
              </div>

              <div className="bg-surface-primary p-3 rounded-lg border border-border-primary/50 flex items-center justify-between">
                <div>
                  <div className="text-text-primary font-semibold font-sans">Quick Views &amp; Actions</div>
                  <div className="text-[11px] text-text-muted font-mono mt-0.5">
                    Type <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-emerald-400">Todo</code>, <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-emerald-400">Work Log</code>, <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-emerald-400">Recurring</code>, <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-emerald-400">Focus</code>, <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-emerald-400">Analytics</code>, or <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-emerald-400">Help</code> to open any screen.
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Support Box */}
      <div className="p-4 bg-surface-secondary border border-border-primary rounded-xl text-center">
        <p className="font-bold text-text-primary font-mono uppercase tracking-wider text-[10px] mb-1">
          Need assistance or feature requests?
        </p>
        <a
          href="mailto:support@taxon.io"
          className="text-text-primary hover:underline text-xs"
          onClick={(e) => {
            e.preventDefault();
            alert('For support queries, contact us at: support@taxon.io');
          }}
        >
          support@taxon.io
        </a>
      </div>
    </div>
  );
}
