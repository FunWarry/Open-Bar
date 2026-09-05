const fs = require('node:fs');
const path = require('node:path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== 'coverage') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

const targetDir = path.join(__dirname, '../frontend/src/test');

let fixedCount = 0;

walkDir(targetDir, filePath => {
  if (!filePath.endsWith('.spec.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace expect(...length).toBe(N) with expect(...length).toEqual(N)
  content = content.replace(/expect\(([^)]+\.length)\)\.toBe\(([^)]+)\)/g, 'expect($1).toEqual($2)');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedCount++;
  }
});

console.log(`Finished! Fixed ${fixedCount} spec files for S5906 rule.`);
