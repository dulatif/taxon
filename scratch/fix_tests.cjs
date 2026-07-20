const fs = require('fs');

function replaceFile(path, from, to) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(from, to);
  fs.writeFileSync(path, content, 'utf8');
}

let tf = '/mnt/Linux/Projects/taxon/src/utils/taskFilters.test.ts';
let tfContent = fs.readFileSync(tf, 'utf8');
tfContent = tfContent.replace(/inbox\[0\]\./g, 'inbox[0]!.');
tfContent = tfContent.replace(/archived\[0\]\./g, 'archived[0]!.');
tfContent = tfContent.replace(/sorted\[0\]\./g, 'sorted[0]!.');
tfContent = tfContent.replace(/sorted\[1\]\./g, 'sorted[1]!.');
tfContent = tfContent.replace(/sorted\[2\]\./g, 'sorted[2]!.');
fs.writeFileSync(tf, tfContent, 'utf8');
