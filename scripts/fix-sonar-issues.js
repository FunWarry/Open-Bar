const fs = require('node:fs');
const path = require('node:path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== 'coverage' && f !== '.angular') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

const targetDir = path.join(__dirname, '../frontend/src/app');

let fixedReadonlyCount = 0;
let fixedImportsCount = 0;

walkDir(targetDir, filePath => {
  if (!filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Fix multiple imports of @ionic/angular/standalone
  let ionicStandaloneImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]@ionic\/angular\/standalone['"];?/g;
  let matches = [...content.matchAll(ionicStandaloneImportRegex)];
  if (matches.length > 1) {
    let combinedImports = new Set();
    matches.forEach(m => {
      m[1].split(',').map(s => s.trim()).filter(Boolean).forEach(i => combinedImports.add(i));
    });
    let singleImport = `import { ${Array.from(combinedImports).join(', ')} } from '@ionic/angular/standalone';`;
    let first = true;
    content = content.replace(ionicStandaloneImportRegex, (match) => {
      if (first) {
        first = false;
        return singleImport;
      }
      return '';
    });
    // Remove blank lines leftover
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    fixedImportsCount++;
  }

  // 2. Fix S2933 (never reassigned properties in constructor / class members)
  // Fix destroy$ = new Subject<void>(); -> private readonly destroy$ = new Subject<void>(); or readonly destroy$
  content = content.replace(/(\n\s*)(private\s+)?destroy\$\s*=\s*/g, '$1private readonly destroy$ = ');
  
  // Fix constructor injected services: constructor(private service: Service, ...) -> constructor(private readonly service: Service, ...)
  content = content.replace(/constructor\s*\(([^)]+)\)/g, (match, args) => {
    let newArgs = args.split(',').map(arg => {
      let trimmed = arg.trim();
      if ((trimmed.startsWith('private ') || trimmed.startsWith('protected ') || trimmed.startsWith('public ')) && !trimmed.includes('readonly ')) {
        return trimmed.replace(/^(private|protected|public)\s+/, '$1 readonly ');
      }
      return arg;
    }).join(',');
    return `constructor(${newArgs})`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedReadonlyCount++;
  }
});

console.log(`Finished! Fixed ${fixedReadonlyCount} files for readonly/imports issues.`);
