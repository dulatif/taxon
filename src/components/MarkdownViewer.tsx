import { Loader2, Maximize } from 'lucide-react';
import mermaid from 'mermaid';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSettings } from '../contexts/SettingsContext';
import MermaidModal from '../modals/MermaidModal';

function MermaidRenderer({ chart, onExpand }: { chart: string; onExpand: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();
  const [isRendering, setIsRendering] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !ref.current || !chart) return;

    setIsRendering(true);
    let isMounted = true;

    // Yield to the main thread to allow modal/drawer animations to finish smoothly
    const timer = setTimeout(() => {
      if (!isMounted) return;
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'neutral',
        themeVariables: {
          fontFamily: 'inherit',
          background: 'transparent',
        },
      });

      mermaid
        .render(`mermaid-${Math.random().toString(36).substring(7)}`, chart)
        .then(({ svg }) => {
          if (isMounted && ref.current) {
            ref.current.innerHTML = svg;
          }
        })
        .catch((err) => {
          console.error('Mermaid render error', err);
          if (isMounted && ref.current) {
            ref.current.innerHTML = `<div class="text-red-400 text-xs p-2">Failed to render Mermaid chart</div>`;
          }
        })
        .finally(() => {
          if (isMounted) setIsRendering(false);
        });
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [chart, isDark, isVisible]);

  return (
    <div ref={containerRef} className="relative group my-4 min-h-[120px]">
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-primary rounded-xl z-10 border border-border-primary">
          <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
        </div>
      )}
      <div
        ref={ref}
        className={`mermaid flex justify-center overflow-x-auto bg-surface-primary p-4 rounded-xl border border-border-primary min-h-[120px] transition-opacity duration-300 ${isRendering ? 'opacity-0' : 'opacity-100'}`}
      />
      {!isRendering && (
        <button
          onClick={onExpand}
          className="absolute top-2 right-2 p-1.5 bg-surface-elevated border border-border-primary rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover shadow-sm cursor-pointer z-20 transition-colors"
          title="Expand Visualization"
        >
          <Maximize className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const baseMarkdownComponents: Record<string, unknown> = {
  h1: ({ node: _node, ...props }: Record<string, unknown>) => (
    <h1
      className="text-2xl font-black text-text-primary mt-6 mb-4 border-b border-border-primary pb-2 tracking-tight font-sans"
      {...props}
    />
  ),
  h2: ({ node: _node, ...props }: Record<string, unknown>) => (
    <h2
      className="text-xl font-bold text-text-primary mt-6 mb-3 tracking-tight font-sans"
      {...props}
    />
  ),
  h3: ({ node: _node, ...props }: Record<string, unknown>) => (
    <h3 className="text-lg font-bold text-text-primary mt-5 mb-2 font-sans" {...props} />
  ),
  h4: ({ node: _node, ...props }: Record<string, unknown>) => (
    <h4 className="text-base font-semibold text-text-primary mt-4 mb-2 font-mono" {...props} />
  ),
  p: ({ node: _node, ...props }: Record<string, unknown>) => (
    <p className="text-sm text-text-muted leading-relaxed mb-4" {...props} />
  ),
  a: ({ node: _node, ...props }: Record<string, unknown>) => (
    <a
      className="text-interactive-primary hover:text-interactive-primary/80 underline underline-offset-4"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  ul: ({ node: _node, ...props }: Record<string, unknown>) => (
    <ul
      className="list-disc list-inside space-y-1.5 text-sm text-text-muted mb-4 pl-2"
      {...props}
    />
  ),
  ol: ({ node: _node, ...props }: Record<string, unknown>) => (
    <ol
      className="list-decimal list-inside space-y-1.5 text-sm text-text-muted mb-4 pl-2"
      {...props}
    />
  ),
  li: ({ node: _node, ...props }: Record<string, unknown>) => (
    <li className="leading-relaxed" {...props} />
  ),
  blockquote: ({ node: _node, ...props }: Record<string, unknown>) => (
    <blockquote
      className="border-l-4 border-interactive-primary/60 bg-surface-primary px-4 py-3 rounded-r-lg text-sm text-text-muted italic mb-4"
      {...props}
    />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pre: ({ node, children, ...props }: any) => {
    const codeChild = node?.children?.[0];
    const isMermaid =
      codeChild?.tagName === 'code' &&
      Array.isArray(codeChild?.properties?.className) &&
      codeChild.properties.className.includes('language-mermaid');

    if (isMermaid) {
      return <>{children}</>;
    }

    return (
      <pre
        className="bg-surface-primary border border-border-primary rounded-xl p-4 overflow-x-auto my-4 text-xs font-mono text-interactive-primary shadow-inner"
        {...props}
      >
        {children}
      </pre>
    );
  },
  code: ({ node: _node, className, children, ...props }: Record<string, unknown>) => {
    const isBlock =
      /language-(\w+)/.exec((className as string) || '') || String(children).includes('\n');
    if (isBlock) {
      return (
        <code className={className as string} {...props}>
          {children as ReactNode}
        </code>
      );
    }
    return (
      <code
        className="bg-surface-primary border border-border-primary text-interactive-primary rounded px-1.5 py-0.5 text-xs font-mono"
        {...props}
      >
        {children as ReactNode}
      </code>
    );
  },
  table: ({ node: _node, ...props }: Record<string, unknown>) => (
    <div className="overflow-x-auto my-4 border border-border-primary rounded-xl">
      <table className="w-full text-left text-xs border-collapse" {...props} />
    </div>
  ),
  thead: ({ node: _node, ...props }: Record<string, unknown>) => (
    <thead
      className="bg-surface-primary border-b border-border-primary text-text-primary font-mono uppercase tracking-wider"
      {...props}
    />
  ),
  tbody: ({ node: _node, ...props }: Record<string, unknown>) => (
    <tbody className="divide-y divide-border-primary/50" {...props} />
  ),
  tr: ({ node: _node, ...props }: Record<string, unknown>) => (
    <tr className="hover:bg-surface-hover transition-colors" {...props} />
  ),
  th: ({ node: _node, ...props }: Record<string, unknown>) => (
    <th className="px-4 py-2.5 font-bold" {...props} />
  ),
  td: ({ node: _node, ...props }: Record<string, unknown>) => (
    <td className="px-4 py-2.5 text-text-muted" {...props} />
  ),
  hr: ({ node: _node, ...props }: Record<string, unknown>) => (
    <hr className="border-border-primary my-6" {...props} />
  ),
};

interface MarkdownViewerProps {
  content: string;
}

export default function MarkdownViewer({ content }: MarkdownViewerProps) {
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const components = useMemo(() => {
    return {
      ...baseMarkdownComponents,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      code: ({ node, className, children, ...props }: any) => {
        const isMermaid = String(className || '').includes('language-mermaid');
        if (isMermaid) {
          return (
            <MermaidRenderer
              chart={String(children)}
              onExpand={() => setExpandedChart(String(children))}
            />
          );
        }
        // Fallback to base code renderer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (baseMarkdownComponents.code as (props: any) => React.ReactNode)({
          node,
          className,
          children,
          ...props,
        });
      },
    };
  }, []);

  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content || '*No content provided*'}
      </ReactMarkdown>
      <MermaidModal
        isOpen={!!expandedChart}
        chartCode={expandedChart}
        onClose={() => setExpandedChart(null)}
      />
    </>
  );
}
