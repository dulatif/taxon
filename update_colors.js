const fs = require('fs');
const file = 'src/modals/AgentImportModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/bg-\[\#0A0A0A\]/g, 'bg-surface-primary');
content = content.replace(/border-\[\#27272A\]/g, 'border-border-primary');
content = content.replace(/text-white/g, 'text-text-primary');
content = content.replace(/text-\[\#8E9192\]/g, 'text-text-muted');
content = content.replace(/hover:bg-\[\#141313\]/g, 'hover:bg-surface-hover');
content = content.replace(/divide-\[\#27272A\]\/50/g, 'divide-border-primary/50');
content = content.replace(/border-\[\#27272A\]\/50/g, 'border-border-primary/50');
content = content.replace(/disabled:bg-\[\#27272A\]/g, 'disabled:bg-surface-secondary');
content = content.replace(/disabled:text-\[\#8E9192\]/g, 'disabled:text-text-muted');
content = content.replace(/bg-\[\#141313\]/g, 'bg-surface-secondary');

fs.writeFileSync(file, content);
console.log('Done');
