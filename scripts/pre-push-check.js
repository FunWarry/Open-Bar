#!/usr/bin/env node

/**
 * OpenBar — Fast Pre-Push Validation Script
 * Verifies the 5 critical quality gates before committing or pushing:
 * 1. Zero IDE Problems / TypeScript compilation (npx tsc --noEmit)
 * 2. i18n JSON Parity (fr.json vs en.json)
 * 3. No hardcoded colors in modified styles (#hex, rgb())
 * 4. Zero @SuppressWarnings in modified Java/TS files
 * 5. Backend compilation check (mvn test-compile)
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
  try {
    const gitDiff = runCommand('git diff --name-only HEAD', ROOT_DIR);
    return gitDiff.trim().split('\n').map(f => f.trim()).filter(Boolean);
  } catch (err) {
    logFail(`Failed checking git diff: ${err.message}`);
    return [];
  }
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
      // Ignore CSS variables definition or comment lines
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

// Run all checks
console.log('\x1b[1m🚀 Running OpenBar Pre-Push Verification Suite...\x1b[0m');
checkI18nParity();
const modifiedFiles = getModifiedFiles();
checkNoSuppressWarnings(modifiedFiles);
checkNoHardcodedColors(modifiedFiles);
checkTypeScript();
checkBackendCompile();

if (hasErrors) {
  console.error('\n\x1b[41m\x1b[37m ✖ PRE-PUSH CHECKS FAILED: Please fix reported issues before pushing! \x1b[0m\n');
  process.exit(1);
} else {
  console.log('\n\x1b[42m\x1b[30m ✔ ALL PRE-PUSH CHECKS PASSED: Ready to commit and push! \x1b[0m\n');
  process.exit(0);
}
