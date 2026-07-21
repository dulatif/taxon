const fs = require('fs');

function replaceFile(path) {
  let content = fs.readFileSync(path, 'utf8');

  // Hardcoded hex colors
  content = content.replace(/bg-\[#000000\]/g, 'bg-surface-app');
  content = content.replace(/bg-\[#0A0A0A\]/g, 'bg-surface-primary');
  content = content.replace(/bg-\[#141313\]/g, 'bg-surface-secondary');
  content = content.replace(/bg-\[#121212\]/g, 'bg-surface-primary');
  content = content.replace(/bg-\[#0E0E0E\]/g, 'bg-surface-primary');
  content = content.replace(/bg-\[#1A1919\]/g, 'bg-surface-hover');
  content = content.replace(/bg-\[#1E1E22\]/g, 'bg-surface-tertiary');
  content = content.replace(/bg-\[#1C1B1B\]/g, 'bg-surface-tertiary');
  
  content = content.replace(/border-\[#27272A\]/g, 'border-border-primary');
  content = content.replace(/text-\[#27272A\]/g, 'text-border-primary');
  content = content.replace(/border-\[#121212\]/g, 'border-border-primary');

  content = content.replace(/text-\[#8E9192\]/g, 'text-text-muted');
  content = content.replace(/text-\[#C4C7C8\]/g, 'text-text-secondary');
  
  // Specific combinations
  content = content.replace(/bg-white text-black/g, 'bg-interactive-primary text-interactive-primary-text');
  content = content.replace(/border-white hover:border-white/g, 'border-border-focus hover:border-border-focus');

  // Heatmap specific in AnalyticsView
  // bg-white/25 border-white/20 hover:border-white/60 -> bg-text-primary/25 border-text-primary/20 hover:border-text-primary/60
  content = content.replace(/bg-white\/25 border-white\/20 hover:border-white\/60/g, 'bg-text-primary/25 border-text-primary/20 hover:border-text-primary/60');
  content = content.replace(/bg-white\/50 border-white\/40 hover:border-white\/80/g, 'bg-text-primary/50 border-text-primary/40 hover:border-text-primary/80');
  content = content.replace(/bg-white\/75 border-white\/60 hover:border-white/g, 'bg-text-primary/75 border-text-primary/60 hover:border-text-primary');
  content = content.replace(/bg-white border-white shadow-\[0_0_8px_rgba\(255,255,255,0\.4\)\]/g, 'bg-text-primary border-text-primary shadow-[0_0_8px_rgba(255,255,255,0.4)]');
  content = content.replace(/bg-white\/25 border border-white\/20/g, 'bg-text-primary/25 border border-text-primary/20');
  content = content.replace(/bg-white\/50 border border-white\/40/g, 'bg-text-primary/50 border border-text-primary/40');
  content = content.replace(/bg-white\/75 border border-white\/60/g, 'bg-text-primary/75 border border-text-primary/60');
  content = content.replace(/bg-white border border-white/g, 'bg-text-primary border border-text-primary');

  // Generic white text / borders
  content = content.replace(/text-white/g, 'text-text-primary');
  content = content.replace(/border-white/g, 'border-border-focus');
  content = content.replace(/bg-white/g, 'bg-interactive-primary'); // in some cases

  fs.writeFileSync(path, content);
  console.log('Fixed', path);
}

replaceFile('/mnt/Linux/Projects/taxon/src/views/AnalyticsView.tsx');
replaceFile('/mnt/Linux/Projects/taxon/src/components/FocusModeView.tsx');
replaceFile('/mnt/Linux/Projects/taxon/src/modals/SpotlightSearchModal.tsx');
