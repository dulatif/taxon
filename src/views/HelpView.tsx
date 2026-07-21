import { HelpCircle } from 'lucide-react';
export default function HelpView() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-white" />
            Help &amp; Support Desk
          </h2>
          <p className="text-xs text-[#8E9192] mt-1">
            Documentation, guidelines, and feedback options.
          </p>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-[#C4C7C8]">
          <p>
            Welcome to <strong>Taxon - Precision Tasking</strong>. This platform is optimized on{' '}
            <strong>Precision in Darkness</strong> aesthetic guidelines. It facilitates absolute
            visual focus, battery efficiency on high contrast OLED matrices, and robust daily
            tracking.
          </p>

          <h4 className="font-bold text-white font-mono uppercase tracking-wider text-[11px] pt-2">
            How to Use focus session:
          </h4>
          <ul className="list-disc pl-4 space-y-1 text-[#8E9192]">
            <li>Select a task on the dashboard or inside a project list.</li>
            <li>
              Click the Play action button to transition into fullscreen Focus Mode immediately.
            </li>
            <li>Click the central circle to toggle timer countdown pausing/resumption.</li>
            <li>Upon completing the timer, your accomplishments increment instantly.</li>
          </ul>

          <div className="p-4 bg-[#141313] border border-[#27272A] rounded-lg mt-4 text-center">
            <p className="font-bold text-white font-mono uppercase tracking-wider text-[10px] mb-2">
              Need direct engineer support?
            </p>
            <a
              href="mailto:support@taxon.io"
              className="text-white hover:underline text-xs"
              onClick={(e) => {
                e.preventDefault();
                alert('For support queries, contact us at: support@taxon.io');
              }}
            >
              support@taxon.io
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
