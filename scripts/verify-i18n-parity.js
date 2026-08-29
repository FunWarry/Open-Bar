const fs = require('node:fs');
const path = require('node:path');

const frPath = 'frontend/src/assets/i18n/fr.json';
const enPath = 'frontend/src/assets/i18n/en.json';

const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const k of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getKeys(obj[k], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const frKeys = new Set(getKeys(fr));
const enKeys = new Set(getKeys(en));

const missingInEn = [...frKeys].filter(k => !enKeys.has(k));
const missingInFr = [...enKeys].filter(k => !frKeys.has(k));

console.log(`Total FR keys: ${frKeys.size}`);
console.log(`Total EN keys: ${enKeys.size}`);

if (missingInEn.length > 0) {
  console.error('Keys in fr.json missing in en.json:', missingInEn);
}

if (missingInFr.length > 0) {
  console.error('Keys in en.json missing in fr.json:', missingInFr);
}

if (missingInEn.length === 0 && missingInFr.length === 0) {
  console.log('✅ PERFECT 100% KEY PARITY BETWEEN fr.json AND en.json!');
  process.exit(0);
} else {
  process.exit(1);
}
