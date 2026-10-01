import { Maximize, RefreshCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import mermaid from 'mermaid';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { TransformComponent, TransformWrapper, useControls } from 'react-zoom-pan-pinch';
import { useSettings } from '../contexts/SettingsContext';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface MermaidModalProps {
  isOpen: boolean;
  chartCode: string | null;
  onClose: () => void;
}

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  return (
    <div className="absolute bottom-4 right-4 z-10 flex gap-1 bg-surface-elevated/90 backdrop-blur-sm border border-border-primary rounded-lg p-1 shadow-lg">
      <button
        onClick={() => zoomIn()}
        className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-colors cursor-pointer"
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        onClick={() => zoomOut()}
        className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-colors cursor-pointer"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <div className="w-px bg-border-primary my-1 mx-0.5" />
      <button
        onClick={() => resetTransform()}
        className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-colors cursor-pointer"
        title="Reset Zoom"
      >
        <RefreshCcw className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function MermaidModal({ isOpen, chartCode, onClose }: MermaidModalProps) {
  useEscapeKey(onClose, { enabled: isOpen });
  const ref = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    if (isOpen && ref.current && chartCode) {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'neutral',
        themeVariables: {
          fontFamily: 'inherit',
          background: 'transparent',
        },
      });

      mermaid
        .render(`mermaid-modal-${Math.random().toString(36).substring(7)}`, chartCode)
        .then(({ svg }) => {
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
        })
        .catch((err) => {
          console.error('Mermaid render error in modal', err);
          if (ref.current) {
            ref.current.innerHTML = `<div class="text-red-400 text-sm p-4">Failed to render Mermaid chart</div>`;
          }
        });
    }
  }, [chartCode, isDark, isOpen]);

  if (!isOpen || !chartCode) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface-elevated border border-border-primary rounded-xl w-full max-w-7xl h-[85vh] relative shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex flex-none items-center justify-between p-4 border-b border-border-primary">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-interactive-primary/10 rounded flex items-center justify-center border border-interactive-primary/20 text-interactive-primary">
                <Maximize className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary tracking-wide uppercase font-mono">
                  Expanded Visualization
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Split View */}
          <div className="flex flex-1 min-h-0 divide-x divide-border-primary overflow-hidden">
            {/* Left side: Code */}
            <div className="w-[30%] min-w-[300px] flex flex-col bg-surface-primary">
              <div className="p-3 border-b border-border-primary bg-surface-secondary/50">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">
                  Mermaid Source
                </span>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <pre className="text-xs font-mono text-interactive-primary break-words whitespace-pre-wrap">
                  {chartCode}
                </pre>
              </div>
            </div>

            {/* Right side: Visualization */}
            <div className="flex-1 flex flex-col bg-surface-app relative">
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <div className="bg-surface-secondary/80 backdrop-blur-sm border border-border-primary rounded px-2.5 py-1.5 text-[10px] font-mono text-text-muted shadow-sm">
                  Drag to pan • Use buttons to zoom
                </div>
              </div>
              <TransformWrapper
                initialScale={1}
                minScale={0.1}
                maxScale={5}
                centerOnInit={true}
                wheel={{ step: 0.1 }}
              >
                <ZoomControls />
                <TransformComponent
                  wrapperClass="!w-full !h-full"
                  contentClass="!w-full !h-full flex items-center justify-center p-8"
                >
                  <div
                    ref={ref}
                    className="mermaid flex items-center justify-center w-full h-full"
                  />
                </TransformComponent>
              </TransformWrapper>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
