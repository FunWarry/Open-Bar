#!/usr/bin/env node

/**
 * OpenBar — Static Analysis and Pruning Tool for Transloco Translation Keys
 * Scans Angular templates (*.html) and TypeScript (*.ts) files to identify and safely
 * prune unused/orphaned keys across fr.json and en.json while maintaining 100% parity.
 *
 * Usage:
 *   node scripts/prune-unused-i18n.js          # Dry run (report only)
 *   node scripts/prune-unused-i18n.js --dry-run # Explicit dry run
 *   node scripts/prune-unused-i18n.js --fix     # Prune orphaned keys and clean empty objects
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const FR_PATH = path.join(FRONTEND_DIR, 'src/assets/i18n/fr.json');
const EN_PATH = path.join(FRONTEND_DIR, 'src/assets/i18n/en.json');
const SRC_DIR = path.join(FRONTEND_DIR, 'src');
const E2E_DIR = path.join(FRONTEND_DIR, 'e2e');

const isFixMode = process.argv.includes('--fix');

/**
 * Explicit safelist for dynamically constructed keys, enums, day names, common system strings,
 * or server-returned status codes that must never be pruned even if not statically hardcoded.
 */
const SAFELIST_PATTERNS = [
  // Common action buttons, status labels, error codes, and core dialogs
  /^COMMON\./,
  /^ERRORS\./,
  /^ERROR_404\./,
  /^THEME\./,
  /^DAYS\./,
  /^MONTHS\./,
  /^DASHBOARD\.STATS\./,
  /^NAV\.TOPBAR\.ROLE_LABELS\./,
  /^NOTIFICATIONS\.TYPES\./,
  /^COMMANDES\.STATUTS\./,
  /^COMMANDES\.TYPES\./,
  /^COMMANDES\.CONFIRM_CANCEL_REASONS\./,
  /^SHIFTS\.SHIFT_TYPES\./,
  /^SHIFTS\.POSTE_TYPES\./,
  /^SHIFTS\.FILTERS\./,
  /^SHIFTS\.AUDIT\.ACTION_\./,
  /^CHECKLISTS\.CATEGORIES\./,
  /^CHECKLISTS\.ROLES\./,
  /^CHECKLISTS\.STATUS\./,
  /^COCKTAILS\.CATEGORIES\./,
  /^COCKTAILS\.ALLERGENS\./,
  /^COCKTAILS\.EQUIPMENT\.CATEGORY_\./,
  /^COCKTAIL\.FLAVOR_/,
  /^COCKTAIL_LIBRARY\.FLAVOR_/,
  /^COCKTAIL_LIBRARY\.ACTIONS\./,
  /^STOCK\.WASTE_REASON_/,
  /^STATIONS\.BADGE_/,
  /^STATIONS\./,
  /^CASH_DRAWER\.TYPE_/,
  /^INVENTORY\.STATUS_/,
  /^BARMAN_DASHBOARD\.STATUS_/,
  /^PURCHASES\.STATUS\./,
  /^RESERVATIONS\.STATUS_/,
  /^AUDIT_LOGS\.ACTIONS\./,
  /^AUDIT_LOGS\.ENTITIES\./,
  /^INGREDIENTS\.UNITS\./
];

/**
 * Recursively extracts dot-notation keys from a nested translation JSON object.
 *
 * @param {Record<string, any>} obj - Parsed JSON translation tree
 * @param {string} prefix - Current dot-notation prefix
 * @returns {string[]} Array of leaf key paths (e.g. ['COMMON.SAVE', 'NAV.HOME'])
 */
function extractKeys(obj, prefix = '') {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(extractKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Recursively walks a directory and collects files matching target extensions.
 *
 * @param {string} dir - Directory to search
 * @param {string[]} extensions - Target file extensions (e.g. ['.ts', '.html'])
 * @returns {string[]} List of matching absolute file paths
 */
function walkDir(dir, extensions) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (item === 'node_modules' || item === '.angular' || item === 'dist') continue;
      results = results.concat(walkDir(fullPath, extensions));
    } else if (extensions.some(ext => item.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Collects candidate prefixes from regex matches in code.
 *
 * @param {RegExp} regex - Search expression
 * @param {string} code - Concatenated code source
 * @param {string[]} allKeys - All available translation keys
 * @param {Set<string>} detectedPrefixes - Collector set
 */
function matchPrefixCandidates(regex, code, allKeys, detectedPrefixes) {
  let match;
  while ((match = regex.exec(code)) !== null) {
    const candidate = match[1];
    if (allKeys.some(k => k.startsWith(candidate))) {
      detectedPrefixes.add(candidate);
    }
  }
}

/**
 * Detects dynamic prefixes in string concatenations ('PREFIX.' + x) or template literals (`PREFIX.${x}`).
 *
 * @param {string} combinedCode - Concatenated source code
 * @param {string[]} allKeys - All translation keys
 * @returns {Set<string>} Set of valid prefixes
 */
function detectDynamicPrefixes(combinedCode, allKeys) {
  const dynamicPrefixRegexConcat = /['"]([A-Z0-9_]+(?:\.[A-Z0-9_]+)*(?:\.|\_))['"]\s*\+/g;
  const dynamicPrefixRegexTemplate = /`([A-Z0-9_]+(?:\.[A-Z0-9_]+)*(?:\.|\_))\$\{/g;
  const detectedPrefixes = new Set();

  matchPrefixCandidates(dynamicPrefixRegexConcat, combinedCode, allKeys, detectedPrefixes);
  matchPrefixCandidates(dynamicPrefixRegexTemplate, combinedCode, allKeys, detectedPrefixes);

  return detectedPrefixes;
}

/**
 * Checks whether a translation key is covered by safelist or dynamic prefixes.
 *
 * @param {string} key - Translation key
 * @param {Set<string>} prefixes - Dynamic prefixes
 * @returns {boolean} True if protected
 */
function isKeyProtected(key, prefixes) {
  if (SAFELIST_PATTERNS.some(pattern => pattern.test(key))) {
    return true;
  }
  for (const prefix of prefixes) {
    if (key.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * Scans code files to extract static strings, template tokens, and dynamic prefixes.
 *
 * @param {string[]} sourceFiles - List of source code files (*.ts, *.html)
 * @param {string[]} allKeys - All defined translation keys across fr.json & en.json
 * @returns {{ detectedPrefixes: Set<string>, usedKeys: Set<string>, unusedKeys: string[] }}
 */
function analyzeCodebase(sourceFiles, allKeys) {
  console.log(`\x1b[36m[i18n:scan] Scanning ${sourceFiles.length} source files (*.ts, *.html)...\x1b[0m`);

  const fileContents = sourceFiles.map(filePath => fs.readFileSync(filePath, 'utf8'));
  const combinedCode = fileContents.join('\n');
  const detectedPrefixes = detectDynamicPrefixes(combinedCode, allKeys);

  const usedKeys = new Set();
  const unusedKeys = [];

  for (const key of allKeys) {
    if (isKeyProtected(key, detectedPrefixes) || combinedCode.includes(key)) {
      usedKeys.add(key);
    } else {
      unusedKeys.push(key);
    }
  }

  return { detectedPrefixes, usedKeys, unusedKeys };
}

/**
 * Removes a dot-notation key from a nested object.
 *
 * @param {Record<string, any>} obj - Translation object
 * @param {string} keyPath - Dot notation key path to delete
 * @returns {boolean} True if deleted, false otherwise
 */
function deleteNestedKey(obj, keyPath) {
  const parts = keyPath.split('.');
  const last = parts.pop();
  let current = obj;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return false;
    current = current[part];
  }
  if (current && Object.prototype.hasOwnProperty.call(current, last)) {
    delete current[last];
    return true;
  }
  return false;
}

/**
 * Recursively cleans empty objects resulting from deletions.
 *
 * @param {Record<string, any>} obj - Translation object to clean
 */
function cleanEmptyObjects(obj) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      cleanEmptyObjects(v);
      if (Object.keys(v).length === 0) {
        delete obj[k];
      }
    }
  }
}

/**
 * Displays a summary sample of orphaned keys.
 *
 * @param {string[]} unusedKeys - Identified unused keys
 */
function displayOrphanedSample(unusedKeys) {
  if (unusedKeys.length === 0) return;
  console.log('Sample of identified orphaned keys (first 25):');
  unusedKeys.slice(0, 25).forEach(k => console.log(`  - ${k}`));
  if (unusedKeys.length > 25) {
    console.log(`  ... and ${unusedKeys.length - 25} more.`);
  }
}

/**
 * Executes file pruning and saves updated JSON translations.
 *
 * @param {Record<string, any>} frContent - French translations
 * @param {Record<string, any>} enContent - English translations
 * @param {string[]} unusedKeys - Keys to prune
 */
function executePruning(frContent, enContent, unusedKeys) {
  console.log('\n\x1b[36m[i18n:prune] Pruning orphaned keys and cleaning empty containers...\x1b[0m');

  let frPrunedCount = 0;
  let enPrunedCount = 0;

  for (const key of unusedKeys) {
    if (deleteNestedKey(frContent, key)) frPrunedCount++;
    if (deleteNestedKey(enContent, key)) enPrunedCount++;
  }

  cleanEmptyObjects(frContent);
  cleanEmptyObjects(enContent);

  fs.writeFileSync(FR_PATH, JSON.stringify(frContent, null, 2) + '\n', 'utf8');
  fs.writeFileSync(EN_PATH, JSON.stringify(enContent, null, 2) + '\n', 'utf8');

  const newFrKeys = extractKeys(frContent);
  const newEnKeys = extractKeys(enContent);

  console.log(`\x1b[32m✔ Pruning complete!\x1b[0m`);
  console.log(`  - Removed from fr.json: ${frPrunedCount} keys`);
  console.log(`  - Removed from en.json: ${enPrunedCount} keys`);
  console.log(`  - Remaining total keys: ${newFrKeys.length}`);

  const postMissingInEn = newFrKeys.filter(k => !newEnKeys.includes(k));
  const postMissingInFr = newEnKeys.filter(k => !newFrKeys.includes(k));

  if (postMissingInEn.length === 0 && postMissingInFr.length === 0) {
    console.log('\x1b[32m✔ 100% key parity preserved successfully!\x1b[0m');
  } else {
    console.error('\x1b[31m✖ Parity violation detected after pruning!\x1b[0m');
    process.exit(1);
  }
}

/**
 * Main execution flow
 */
function main() {
  console.log('\x1b[35m=== OpenBar i18n Static Analysis & Pruning Tool ===\x1b[0m\n');

  if (!fs.existsSync(FR_PATH) || !fs.existsSync(EN_PATH)) {
    console.error('\x1b[31mError: Translation files not found at expected paths.\x1b[0m');
    process.exit(1);
  }

  const frContent = JSON.parse(fs.readFileSync(FR_PATH, 'utf8'));
  const enContent = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));

  const frKeys = extractKeys(frContent);
  const enKeys = extractKeys(enContent);
  const allKeys = Array.from(new Set([...frKeys, ...enKeys]));

  console.log(`Loaded ${allKeys.length} total translation keys across fr.json and en.json.`);

  const sourceFiles = [
    ...walkDir(SRC_DIR, ['.ts', '.html']),
    ...walkDir(E2E_DIR, ['.ts'])
  ];
  const { detectedPrefixes, usedKeys, unusedKeys } = analyzeCodebase(sourceFiles, allKeys);

  console.log(`\n\x1b[32m✔ Active/Protected keys:\x1b[0m ${usedKeys.size}`);
  console.log(`\x1b[34mℹ Detected dynamic prefixes:\x1b[0m ${detectedPrefixes.size}`);
  console.log(`\x1b[33m⚠ Unused/Orphaned keys identified:\x1b[0m ${unusedKeys.length}\n`);

  displayOrphanedSample(unusedKeys);

  if (isFixMode) {
    executePruning(frContent, enContent, unusedKeys);
  } else {
    console.log('\n\x1b[36m[i18n:scan] Dry-run completed. To prune orphaned keys, run: node scripts/prune-unused-i18n.js --fix\x1b[0m');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  extractKeys,
  analyzeCodebase,
  deleteNestedKey,
  cleanEmptyObjects,
  SAFELIST_PATTERNS
};
