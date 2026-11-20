#!/usr/bin/env node

/**
 * OpenBar — i18n Key & Value Search Utility
 * Fast search utility to find existing translations by key or value in fr.json and en.json.
 * Use this to prevent creating duplicate translation keys and maximize reuse of COMMON and existing tokens.
 *
 * Usage:
 *   node scripts/find-i18n.js "Enregistrer"
 *   node scripts/find-i18n.js "Cancel"
 *   node scripts/find-i18n.js "COMMON"
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const I18N_DIR = path.join(ROOT_DIR, 'frontend/src/assets/i18n');

const query = process.argv.slice(2).join(' ').trim().toLowerCase();

if (!query) {
  console.log('\x1b[33mUsage: node scripts/find-i18n.js <search-term>\x1b[0m');
  console.log('Examples:');
  console.log('  node scripts/find-i18n.js "Enregistrer"');
  console.log('  node scripts/find-i18n.js "Cancel"');
  console.log('  node scripts/find-i18n.js "COMMON.SAVE"');
  process.exit(0);
}

/**
 * Recursively extracts dot-notation keys and values.
 */
function extractEntries(obj, map, prefix = '') {
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      extractEntries(v, map, fullKey);
    } else {
      map.set(fullKey, String(v));
    }
  }
}

function main() {
  const files = fs.readdirSync(I18N_DIR).filter(f => f.endsWith('.json'));
  const localeMaps = new Map();

  for (const file of files) {
    const lang = path.basename(file, '.json');
    const content = JSON.parse(fs.readFileSync(path.join(I18N_DIR, file), 'utf8'));
    const map = new Map();
    extractEntries(content, map);
    localeMaps.set(lang, map);
  }

  const frMap = localeMaps.get('fr') || new Map();
  const enMap = localeMaps.get('en') || new Map();

  const allKeys = Array.from(new Set([...frMap.keys(), ...enMap.keys()]));
  const results = [];

  for (const key of allKeys) {
    const frVal = frMap.get(key) || '';
    const enVal = enMap.get(key) || '';

    const matchKey = key.toLowerCase().includes(query);
    const matchFr = frVal.toLowerCase().includes(query);
    const matchEn = enVal.toLowerCase().includes(query);

    if (matchKey || matchFr || matchEn) {
      results.push({
        key,
        fr: frVal,
        en: enVal,
        exactMatch: frVal.toLowerCase() === query || enVal.toLowerCase() === query || key.toLowerCase() === query
      });
    }
  }

  // Sort exact matches first, then alphabetical
  results.sort((a, b) => {
    if (a.exactMatch && !b.exactMatch) return -1;
    if (!a.exactMatch && b.exactMatch) return 1;
    return a.key.localeCompare(b.key);
  });

  console.log(`\n\x1b[35m=== OpenBar i18n Search Results for "${query}" ===\x1b[0m`);
  console.log(`Found \x1b[32m${results.length}\x1b[0m matching translation key(s):\n`);

  if (results.length === 0) {
    console.log(`  No existing translation matching "${query}" found.`);
    console.log(`  You can safely create a new key under the appropriate functional namespace.\n`);
    return;
  }

  const displayLimit = 25;
  results.slice(0, displayLimit).forEach((r, idx) => {
    const badge = r.exactMatch ? '\x1b[32m[EXACT MATCH]\x1b[0m ' : '';
    console.log(`${idx + 1}. ${badge}\x1b[36m${r.key}\x1b[0m`);
    console.log(`   FR: "${r.fr}"`);
    console.log(`   EN: "${r.en}"`);
  });

  if (results.length > displayLimit) {
    console.log(`\n  ... and ${results.length - displayLimit} more matches. Narrow down your search if needed.`);
  }

  console.log('\n\x1b[33m💡 Reusability Tip:\x1b[0m If one of the above keys fits your use case (e.g. COMMON.*), reuse it instead of creating a duplicate key!\n');
}

main();
