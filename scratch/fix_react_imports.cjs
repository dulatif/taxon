const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

walk('/mnt/Linux/Projects/taxon/src', (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Remove `import React from 'react';` entirely
  content = content.replace(/^import\s+React\s+from\s+['"]react['"];?\s*(\n|$)/gm, '');
  
  // Replace `import React, { ... } from 'react'` with `import { ... } from 'react'`
  content = content.replace(/^import\s+React\s*,\s*\{([^}]+)\}\s+from\s+['"]react['"];?/gm, "import { $1 } from 'react';");

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed unused React in ' + filePath);
  }
});
