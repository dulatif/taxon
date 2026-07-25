import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// eslint-disable-next-line react-refresh/only-export-components
export const markdownComponents: Record<string, unknown> = {
  h1: ({ node: _node, ...props }: Record<string, unknown>) => (
    <h1
      className="text-2xl font-black text-white mt-6 mb-4 border-b border-[#27272A] pb-2 tracking-tight font-sans"
      {...props}
    />
  ),
  h2: ({ node: _node, ...props }: Record<string, unknown>) => (
    <h2 className="text-xl font-bold text-white mt-6 mb-3 tracking-tight font-sans" {...props} />
  ),
  h3: ({ node: _node, ...props }: Record<string, unknown>) => (
    <h3 className="text-lg font-bold text-[#E4E4E7] mt-5 mb-2 font-sans" {...props} />
  ),
  h4: ({ node: _node, ...props }: Record<string, unknown>) => (
    <h4 className="text-base font-semibold text-[#D4D4D8] mt-4 mb-2 font-mono" {...props} />
  ),
  p: ({ node: _node, ...props }: Record<string, unknown>) => (
    <p className="text-sm text-[#C4C7C8] leading-relaxed mb-4" {...props} />
  ),
  a: ({ node: _node, ...props }: Record<string, unknown>) => (
    <a
      className="text-blue-400 hover:text-blue-300 underline underline-offset-4"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  ul: ({ node: _node, ...props }: Record<string, unknown>) => (
    <ul className="list-disc list-inside space-y-1.5 text-sm text-[#C4C7C8] mb-4 pl-2" {...props} />
  ),
  ol: ({ node: _node, ...props }: Record<string, unknown>) => (
    <ol
      className="list-decimal list-inside space-y-1.5 text-sm text-[#C4C7C8] mb-4 pl-2"
      {...props}
    />
  ),
  li: ({ node: _node, ...props }: Record<string, unknown>) => (
    <li className="leading-relaxed" {...props} />
  ),
  blockquote: ({ node: _node, ...props }: Record<string, unknown>) => (
    <blockquote
      className="border-l-4 border-blue-500/60 bg-[#141313] px-4 py-3 rounded-r-lg text-sm text-[#A1A1AA] italic mb-4"
      {...props}
    />
  ),
  pre: ({ node: _node, ...props }: Record<string, unknown>) => (
    <pre
      className="bg-[#141313] border border-[#27272A] rounded-xl p-4 overflow-x-auto my-4 text-xs font-mono text-cyan-300 shadow-inner"
      {...props}
    />
  ),
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
        className="bg-[#141313] border border-[#27272A] text-cyan-300 rounded px-1.5 py-0.5 text-xs font-mono"
        {...props}
      >
        {children as ReactNode}
      </code>
    );
  },
  table: ({ node: _node, ...props }: Record<string, unknown>) => (
    <div className="overflow-x-auto my-4 border border-[#27272A] rounded-xl">
      <table className="w-full text-left text-xs border-collapse" {...props} />
    </div>
  ),
  thead: ({ node: _node, ...props }: Record<string, unknown>) => (
    <thead
      className="bg-[#141313] border-b border-[#27272A] text-white font-mono uppercase tracking-wider"
      {...props}
    />
  ),
  tbody: ({ node: _node, ...props }: Record<string, unknown>) => (
    <tbody className="divide-y divide-[#27272A]/50" {...props} />
  ),
  tr: ({ node: _node, ...props }: Record<string, unknown>) => (
    <tr className="hover:bg-white/5 transition-colors" {...props} />
  ),
  th: ({ node: _node, ...props }: Record<string, unknown>) => (
    <th className="px-4 py-2.5 font-bold" {...props} />
  ),
  td: ({ node: _node, ...props }: Record<string, unknown>) => (
    <td className="px-4 py-2.5 text-[#C4C7C8]" {...props} />
  ),
  hr: ({ node: _node, ...props }: Record<string, unknown>) => (
    <hr className="border-[#27272A] my-6" {...props} />
  ),
};

interface MarkdownViewerProps {
  content: string;
}

export default function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content || '*No content provided*'}
    </ReactMarkdown>
  );
}
