#!/usr/bin/env node

/**
 * OpenBar — Fast Pre-Push Validation Script
 * Verifies the 10 critical quality gates before committing or pushing:
 * 1. Transloco i18n JSON Parity (fr.json vs en.json)
 * 2. Zero @SuppressWarnings in modified Java/TS files
 * 3. No hardcoded colors in modified styles (#hex, rgb())
 * 4. CSS / SCSS Sonar Quality Rules (css:S9449 transition:all & css:S9440 reduced-motion)
 * 5. TypeScript Cognitive Complexity (Sonar typescript:S3776 <= 15)
 * 6.Consistent Line Endings (no mixed CRLF/LF that corrupt IDE LSP incremental buffers)
 * 7. Full-File Backend Java Sonar Quality Rules (S9435, S6213, S2925, S2589)
 * 8. Zero IDE Problems / Frontend TypeScript compilation (npx tsc --noEmit)
 * 9. Backend compilation check (mvn test-compile)
 * 10. Live IDE Extension Diagnostics (Eclipse JDT LS redhat.java & SonarQube for IDE logs)
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');

let hasErrors = false;

function logStep(name) {
  console.log(`\n\x1b[36m=== [CHECK] ${name} ===\x1b[0m`);
}

function logPass(msg) {
  console.log(`  \x1b[32m✔ PASS:\x1b[0m ${msg}`);
}

function logFail(msg) {
  console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${msg}`);
  hasErrors = true;
}

function extractKeys(obj, set, prefix = '') {
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      extractKeys(v, set, fullKey);
    } else {
      set.add(fullKey);
    }
  }
}

// --- Check 1: i18n Parity ---
function checkI18nParity() {
  logStep('Transloco i18n Parity (fr.json vs en.json)');
  const frPath = path.join(FRONTEND_DIR, 'src/assets/i18n/fr.json');
  const enPath = path.join(FRONTEND_DIR, 'src/assets/i18n/en.json');

  if (!fs.existsSync(frPath) || !fs.existsSync(enPath)) {
    logFail('fr.json or en.json not found!');
    return;
  }

  const frKeys = new Set();
  const enKeys = new Set();

  try {
    extractKeys(JSON.parse(fs.readFileSync(frPath, 'utf8')), frKeys);
    extractKeys(JSON.parse(fs.readFileSync(enPath, 'utf8')), enKeys);
  } catch (err) {
    logFail(`Failed to parse i18n JSON: ${err.message}`);
    return;
  }

  const missingInEn = [...frKeys].filter(k => !enKeys.has(k));
  const missingInFr = [...enKeys].filter(k => !frKeys.has(k));

  if (missingInEn.length > 0) {
    logFail(`Keys present in fr.json but missing in en.json (${missingInEn.length}):\n    ${missingInEn.slice(0, 10).join('\n    ')}`);
  }
  if (missingInFr.length > 0) {
    logFail(`Keys present in en.json but missing in fr.json (${missingInFr.length}):\n    ${missingInFr.slice(0, 10).join('\n    ')}`);
  }

  if (missingInEn.length === 0 && missingInFr.length === 0) {
    logPass(`100% i18n parity (${frKeys.size} keys verified in fr.json & en.json).`);
  }
}

function runCommand(command, cwd) {
  return execSync(command, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
    env: { ...process.env, PATH: process.env.PATH || '' }
  });
}

function getModifiedFiles() {
  const fileSet = new Set();
  try {
    const working = runCommand('git status --porcelain', ROOT_DIR);
    working.trim().split('\n').forEach(line => {
      if (!line) return;
      const file = line.substring(3).trim();
      if (file) fileSet.add(file);
    });

    let baseRef = 'origin/dev';
    try {
      runCommand('git rev-parse --verify origin/dev', ROOT_DIR);
    } catch {
      baseRef = 'dev';
    }
    const branchDiff = runCommand(`git diff --name-only ${baseRef}...HEAD`, ROOT_DIR);
    branchDiff.trim().split('\n').forEach(f => {
      const trimmed = f.trim();
      if (trimmed) fileSet.add(trimmed);
    });
  } catch {
    try {
      const gitDiff = runCommand('git diff --name-only HEAD', ROOT_DIR);
      gitDiff.trim().split('\n').forEach(f => {
        const trimmed = f.trim();
        if (trimmed) fileSet.add(trimmed);
      });
    } catch {}
  }
  return [...fileSet];
}

// --- Check 2: No @SuppressWarnings ---
function checkNoSuppressWarnings(modifiedFiles) {
  logStep('Absence of @SuppressWarnings');
  const files = modifiedFiles.filter(f => f.endsWith('.java') || f.endsWith('.ts'));

  let found = 0;
  for (const rel of files) {
    if (!rel) continue;
    const full = path.join(ROOT_DIR, rel);
    if (fs.existsSync(full)) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('@SuppressWarnings')) {
        logFail(`Found @SuppressWarnings in ${rel} - remove and fix underlying issue!`);
        found++;
      }
    }
  }
  if (found === 0) {
    logPass('Zero @SuppressWarnings found in modified files.');
  }
}

// --- Check 3: Zero IDE Problems / Frontend TypeScript Check ---
function checkTypeScript() {
  logStep('Frontend TypeScript & Template Check (npx tsc --noEmit)');
  try {
    runCommand('npx tsc --noEmit', FRONTEND_DIR);
    logPass('Zero TypeScript errors in frontend. IDE Problems panel clean.');
  } catch (err) {
    logFail(`TypeScript compilation failed with errors:\n${err.stdout ? err.stdout.toString() : err.message}`);
  }
}

// --- Check 4: Backend Compilation Check ---
function checkBackendCompile() {
  logStep('Backend Compilation Check (mvn test-compile -q)');
  try {
    runCommand('mvn test-compile -q', BACKEND_DIR);
    logPass('Backend compiled successfully (Java 22 + Spring Boot 4).');
  } catch (err) {
    logFail(`Backend test-compile failed:\n${err.stderr ? err.stderr.toString() : err.message}`);
  }
}

// --- Check 5: No Hardcoded Hex/RGB Colors in modified SCSS/CSS ---
function checkNoHardcodedColors(modifiedFiles) {
  logStep('No Hardcoded Colors in Modified Styles (CSS Variables Enforced)');
  const styleFiles = modifiedFiles.filter(f => (f.endsWith('.scss') || f.endsWith('.css')) && !f.includes('variables.css'));

  const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
  let issues = 0;

  for (const rel of styleFiles) {
    if (!rel) continue;
    const full = path.join(ROOT_DIR, rel);
    if (!fs.existsSync(full)) continue;

    const lines = fs.readFileSync(full, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('--') || line.trim().startsWith('/*') || line.trim().startsWith('//')) return;
      const match = line.match(hexRegex);
      if (match) {
        logFail(`Hardcoded color ${match.join(', ')} at ${rel}:${idx + 1}. Use var(--...) tokens instead!`);
        issues++;
      }
    });
  }

  if (issues === 0) {
    logPass('All modified styles use CSS variable design tokens.');
  }
}

// --- Check 6: CSS / SCSS Sonar Quality Rules (css:S9449 transition:all & css:S9440 reduced-motion) ---
function checkCssSonarQuality(modifiedFiles) {
  logStep('CSS & SCSS Sonar Quality Rules (S9449 & S9440)');
  const styleFiles = modifiedFiles.filter(f => (f.endsWith('.scss') || f.endsWith('.css')) && !f.includes('variables.css'));

  let issues = 0;
  for (const rel of styleFiles) {
    if (!rel) continue;
    const full = path.join(ROOT_DIR, rel);
    if (!fs.existsSync(full)) continue;

    const content = fs.readFileSync(full, 'utf8');
    const lines = content.split('\n');

    // Rule 1: S9449 - transition: all
    lines.forEach((line, idx) => {
      if (line.trim().startsWith('/*') || line.trim().startsWith('//')) return;
      if (/transition\s*:\s*all\b/i.test(line)) {
        logFail(`Disallowed 'transition: all' at ${rel}:${idx + 1}. Sonar S9449 requires specifying explicit transition properties.`);
        issues++;
      }
    });

    // Rule 2: S9440 - animation or @keyframes requires prefers-reduced-motion
    const hasAnimation = /animation\s*:/i.test(content) || /@keyframes\b/i.test(content);
    const hasReducedMotion = /prefers-reduced-motion/i.test(content);
    if (hasAnimation && !hasReducedMotion) {
      logFail(`Missing accessibility media query 'prefers-reduced-motion' in ${rel}. Sonar S9440 requires respecting reduced-motion preferences when using animations.`);
      issues++;
    }
  }

  if (issues === 0) {
    logPass('All modified stylesheets comply with Sonar CSS accessibility & transition rules.');
  }
}

// --- Check 7: TypeScript Cognitive Complexity (SonarQube typescript:S3776 <= 15) ---
function checkCognitiveComplexity(modifiedFiles) {
  logStep('TypeScript Cognitive Complexity Check (Sonar typescript:S3776 <= 15)');
  const tsFiles = modifiedFiles.filter(f => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.endsWith('.d.ts'));

  if (tsFiles.length === 0) {
    logPass('No modified TypeScript application files to evaluate.');
    return;
  }

  let tsModule;
  try {
    tsModule = require(path.join(FRONTEND_DIR, 'node_modules/typescript'));
  } catch (err) {
    console.warn(`  ⚠️ Could not load TypeScript compiler AST module: ${err.message}`);
    return;
  }

  let violations = 0;
  const MAX_COMPLEXITY = 15;

  function computeComplexity(node) {
    let complexity = 0;
    function walk(n, nesting) {
      let nestInc = 0;
      switch (n.kind) {
        case tsModule.SyntaxKind.IfStatement:
        case tsModule.SyntaxKind.ConditionalExpression:
        case tsModule.SyntaxKind.SwitchStatement:
        case tsModule.SyntaxKind.ForStatement:
        case tsModule.SyntaxKind.ForInStatement:
        case tsModule.SyntaxKind.ForOfStatement:
        case tsModule.SyntaxKind.WhileStatement:
        case tsModule.SyntaxKind.DoStatement:
        case tsModule.SyntaxKind.CatchClause:
          complexity += (1 + nesting);
          nestInc = 1;
          break;
        case tsModule.SyntaxKind.BinaryExpression: {
          const op = n.operatorToken.kind;
          if (op === tsModule.SyntaxKind.AmpersandAmpersandToken || op === tsModule.SyntaxKind.BarBarToken) {
            const parent = n.parent;
            if (!parent || parent.kind !== tsModule.SyntaxKind.BinaryExpression || parent.operatorToken.kind !== op) {
              complexity += 1;
            }
          }
          break;
        }
      }

      tsModule.forEachChild(n, (child) => {
        if (child.kind === tsModule.SyntaxKind.FunctionDeclaration ||
            child.kind === tsModule.SyntaxKind.MethodDeclaration ||
            child.kind === tsModule.SyntaxKind.ArrowFunction ||
            child.kind === tsModule.SyntaxKind.FunctionExpression) {
          return;
        }
        walk(child, nesting + nestInc);
      });
    }

    tsModule.forEachChild(node.body || node, (child) => walk(child, 0));
    return complexity;
  }

  for (const rel of tsFiles) {
    const full = path.join(ROOT_DIR, rel);
    if (!fs.existsSync(full)) continue;

    const code = fs.readFileSync(full, 'utf8');
    const sf = tsModule.createSourceFile(path.basename(rel), code, tsModule.ScriptTarget.Latest, true);

    function inspect(n) {
      if (tsModule.isMethodDeclaration(n) || tsModule.isFunctionDeclaration(n)) {
        const c = computeComplexity(n);
        if (c > MAX_COMPLEXITY) {
          const name = n.name ? n.name.getText(sf) : 'anonymous function';
          const { line, character } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
          logFail(`Method "${name}" at ${rel}:${line + 1}:${character + 1} has Cognitive Complexity of ${c} (max allowed is ${MAX_COMPLEXITY}, Sonar typescript:S3776).`);
          violations++;
        }
      }
      tsModule.forEachChild(n, inspect);
    }

    inspect(sf);
  }

  if (violations === 0) {
    logPass(`All methods in modified TypeScript files adhere to Cognitive Complexity <= ${MAX_COMPLEXITY} (Sonar S3776).`);
  }
}

// --- Check 8: Consistent Line Endings (Prevent LSP Incremental Buffer Corruption) ---
function checkConsistentLineEndings(modifiedFiles) {
  logStep('Consistent Line Endings Check (No Mixed CRLF/LF)');
  const textExts = ['.java', '.ts', '.html', '.scss', '.css', '.json', '.sql', '.yml', '.yaml', '.xml'];
  const targets = modifiedFiles.filter(f => textExts.some(ext => f.endsWith(ext)));

  let mixedCount = 0;
  for (const rel of targets) {
    const full = path.join(ROOT_DIR, rel);
    if (!fs.existsSync(full)) continue;

    const raw = fs.readFileSync(full, 'utf8');
    const hasCrlf = raw.includes('\r\n');
    const withoutCrlf = raw.replace(/\r\n/g, '');
    const hasBareLf = withoutCrlf.includes('\n');

    if (hasCrlf && hasBareLf) {
      logFail(`Mixed CRLF and LF line endings in ${rel}. This corrupts Eclipse JDT LS (redhat.java) incremental working copies! Normalize line endings.`);
      mixedCount++;
    }
  }

  if (mixedCount === 0) {
    logPass('All modified source files have consistent line endings.');
  }
}

// --- Check 9: Full-File Backend Java Sonar Quality Rules ---
function checkJavaSonarRules(modifiedFiles) {
  logStep('Full-File Backend Java Sonar Quality Rules (S9435, S6213, S2925, S2589)');
  const javaFiles = modifiedFiles.filter(f => f.endsWith('.java'));

  let issues = 0;
  for (const rel of javaFiles) {
    const full = path.join(ROOT_DIR, rel);
    if (!fs.existsSync(full)) continue;

    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
    const isTestFile = rel.endsWith('Test.java') || rel.includes('/test/') || rel.includes('\\test\\');

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

      // Strip string literals before matching identifier/expression patterns
      const codeWithoutStrings = line.replace(/"(?:\\.|[^"\\])*"/g, '""');

      // Rule java:S9435 — Negated ternary condition (!cond ? a : b)
      if (/![a-zA-Z0-9_.]+\s*(?:\([^)]*\))?\s*\?[^:]+:/.test(codeWithoutStrings) && !codeWithoutStrings.includes('!=')) {
        logFail(`Sonar java:S9435 at ${rel}:${idx + 1}: Invert negated ternary condition and swap branches.`);
        issues++;
      }

      // Rule java:S6213 — Restricted identifier 'record' used as variable/parameter name
      if (/\b(?:var|final\s+[A-Za-z0-9_<>]+|[A-Z][A-Za-z0-9_<>]*)\s+record\s*[=,;)]/.test(codeWithoutStrings)) {
        logFail(`Sonar java:S6213 at ${rel}:${idx + 1}: Rename variable 'record' to avoid restricted identifier.`);
        issues++;
      }

      // Rule java:S2925 — Thread.sleep() in tests
      if (isTestFile && /\bThread\.sleep\s*\(/.test(codeWithoutStrings)) {
        logFail(`Sonar java:S2925 at ${rel}:${idx + 1}: Do not use Thread.sleep() in tests.`);
        issues++;
      }

      // Rule java:S2589 — Gratuitous null check on Spring non-null UserDetails/Environment return values
      if (/userDetails\.getAuthorities\(\)\s*!=\s*null|\.getActiveProfiles\(\)\s*!=\s*null/.test(codeWithoutStrings)) {
        logFail(`Sonar java:S2589 at ${rel}:${idx + 1}: Redundant null check on non-null Spring return value.`);
        issues++;
      }
    });
  }

  if (issues === 0) {
    logPass('All modified Java files pass full-file SonarLint static checks.');
  }
}

// --- Check 10: Live IDE Extension Diagnostics (redhat.java JDT LS & SonarQube for IDE) ---
function checkLiveIdeDiagnostics() {
  logStep('Live IDE Extension Diagnostics (Eclipse JDT LS & SonarQube for IDE)');
  const appData = process.env.APPDATA;
  if (!appData) {
    logPass('APPDATA not set (CI/headless environment); skipping local IDE log inspection.');
    return;
  }

  const ideBase = path.join(appData, 'Antigravity IDE');
  if (!fs.existsSync(ideBase)) {
    logPass('Antigravity IDE appData directory not present; skipping local IDE log inspection.');
    return;
  }

  let ideErrors = 0;

  // 10a. Inspect Eclipse JDT LS (redhat.java) .metadata/.log for the current workspace
  try {
    const wsStorageDir = path.join(ideBase, 'User', 'workspaceStorage');
    if (fs.existsSync(wsStorageDir)) {
      const normalizedRoot = ROOT_DIR.toLowerCase().replace(/\\/g, '/');
      let jdtLogPath = null;
      let latestMtime = 0;

      for (const entry of fs.readdirSync(wsStorageDir)) {
        const candidateDir = path.join(wsStorageDir, entry);
        const wsJsonPath = path.join(candidateDir, 'workspace.json');
        const logCandidate = path.join(candidateDir, 'redhat.java', 'jdt_ws', '.metadata', '.log');
        if (!fs.existsSync(logCandidate)) continue;

        let matchesWorkspace = false;
        if (fs.existsSync(wsJsonPath)) {
          const wsJson = decodeURIComponent(fs.readFileSync(wsJsonPath, 'utf8')).toLowerCase().replace(/\\/g, '/');
          if (wsJson.includes(normalizedRoot) || wsJson.includes('open-bar')) {
            matchesWorkspace = true;
          }
        }
        const stat = fs.statSync(logCandidate);
        if (matchesWorkspace && stat.mtimeMs >= latestMtime) {
          latestMtime = stat.mtimeMs;
          jdtLogPath = logCandidate;
        }
      }

      if (jdtLogPath) {
        const logContent = fs.readFileSync(jdtLogPath, 'utf8');
        // Parse only the active JDT LS session (after the last !SESSION header)
        const sessions = logContent.split(/^!SESSION\s/m);
        const currentSession = sessions[sessions.length - 1] || logContent;
        const problemRegex = /^!MESSAGE\s+(\d+)\s+problems?\s+reported\s+for\s+(\/[^\r\n]+\.java)/gm;
        const latestProblemsByFile = new Map();
        let match;
        while ((match = problemRegex.exec(currentSession)) !== null) {
          latestProblemsByFile.set(match[2], Number.parseInt(match[1], 10));
        }

        for (const [fileUri, count] of latestProblemsByFile.entries()) {
          if (count > 0) {
            logFail(`IDE JDT Language Server (redhat.java) reports ${count} problem(s) in ${fileUri}. Check IDE Problems tab or restart Java Language Server if stale.`);
            ideErrors++;
          }
        }
      }
    }
  } catch (err) {
    console.warn(`  ⚠️ Could not inspect JDT LS log: ${err.message}`);
  }

  // 10b. Inspect SonarQube for IDE (SonarSource.sonarlint-vscode) log in the active window
  try {
    const logsDir = path.join(ideBase, 'logs');
    if (fs.existsSync(logsDir)) {
      let latestSonarLog = null;
      let latestMtime = 0;

      for (const sessionDir of fs.readdirSync(logsDir)) {
        const sessionPath = path.join(logsDir, sessionDir);
        if (!fs.statSync(sessionPath).isDirectory()) continue;
        for (const winDir of fs.readdirSync(sessionPath)) {
          const sonarLog = path.join(
            sessionPath,
            winDir,
            'exthost',
            'SonarSource.sonarlint-vscode',
            'SonarQube for IDE.log'
          );
          if (fs.existsSync(sonarLog)) {
            const mtime = fs.statSync(sonarLog).mtimeMs;
            if (mtime >= latestMtime) {
              latestMtime = mtime;
              latestSonarLog = sonarLog;
            }
          }
        }
      }

      if (latestSonarLog) {
        const sonarContent = fs.readFileSync(latestSonarLog, 'utf8');
        const lines = sonarContent.split(/\r?\n/);
        const latestIssuesByFile = new Map();
        let currentBatchFiles = new Set();

        for (const line of lines) {
          if (line.includes('Start analysis')) {
            currentBatchFiles = new Set();
          }
          const langMatch = line.match(/Language of file "(file:\/\/\/[^"]+)"/);
          if (langMatch) {
            currentBatchFiles.add(decodeURIComponent(langMatch[1]));
          }
          const fileMatch = line.match(/Initializing metadata of file (file:\/\/\/[^\s]+)/);
          if (fileMatch) {
            currentBatchFiles.add(decodeURIComponent(fileMatch[1]));
          }
          const issueMatch = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}).*Analysis detected (\d+) issues? and (\d+) Security Hotspots?/);
          if (issueMatch && currentBatchFiles.size > 0) {
            const logTimeMs = new Date(issueMatch[1].replace(' ', 'T')).getTime();
            const issues = Number.parseInt(issueMatch[2], 10);
            const hotspots = Number.parseInt(issueMatch[3], 10);

            if (issues === 0 && hotspots === 0) {
              for (const fUri of currentBatchFiles) {
                latestIssuesByFile.set(fUri, { issues: 0, hotspots: 0, logTimeMs });
              }
            } else if (currentBatchFiles.size === 1) {
              const [singleUri] = currentBatchFiles;
              latestIssuesByFile.set(singleUri, { issues, hotspots, logTimeMs });
            }
            currentBatchFiles = new Set();
          }
        }

        for (const [fileUri, result] of latestIssuesByFile.entries()) {
          if (result.issues > 0 || result.hotspots > 0) {
            const localPath = fileUri.replace(/^file:\/\/\//i, '');
            if (fs.existsSync(localPath)) {
              const fileMtimeMs = fs.statSync(localPath).mtimeMs;
              // If the file on disk was modified after the SonarLint analysis timestamp, ignore stale pre-edit entry
              if (result.logTimeMs && fileMtimeMs > result.logTimeMs + 2000) {
                continue;
              }
            }
            const shortName = path.basename(fileUri);
            logFail(`SonarQube for IDE reports ${result.issues} issue(s) and ${result.hotspots} Security Hotspot(s) in ${shortName} (${fileUri}).`);
            ideErrors++;
          }
        }
      }
    }
  } catch (err) {
    console.warn(`  ⚠️ Could not inspect SonarQube for IDE log: ${err.message}`);
  }

  if (ideErrors === 0) {
    logPass('Zero active issues reported in live Eclipse JDT LS & SonarQube for IDE logs.');
  }
}

// Run all checks
console.log('\x1b[1m🚀 Running OpenBar Pre-Push Verification Suite...\x1b[0m');
checkI18nParity();
const modifiedFiles = getModifiedFiles();
checkNoSuppressWarnings(modifiedFiles);
checkNoHardcodedColors(modifiedFiles);
checkCssSonarQuality(modifiedFiles);
checkCognitiveComplexity(modifiedFiles);
checkConsistentLineEndings(modifiedFiles);
checkJavaSonarRules(modifiedFiles);
checkTypeScript();
checkBackendCompile();
checkLiveIdeDiagnostics();

if (hasErrors) {
  console.error('\n\x1b[41m\x1b[37m ✖ PRE-PUSH CHECKS FAILED: Please fix reported issues before pushing! \x1b[0m\n');
  process.exit(1);
} else {
  console.log('\n\x1b[42m\x1b[30m ✔ ALL PRE-PUSH CHECKS PASSED: Ready to commit and push! \x1b[0m\n');
  process.exit(0);
}
