#!/usr/bin/env node

/**
 * OpenBar — Unit Test Suite for prune-unused-i18n.js
 * Validates the core pruning engine, key extraction, deletion, and empty container cleanup.
 */

const assert = require('node:assert');
const {
  extractKeys,
  deleteNestedKey,
  cleanEmptyObjects,
  SAFELIST_PATTERNS
} = require('./prune-unused-i18n');

console.log('Running prune-unused-i18n unit tests...');

// 1. Test extractKeys
const sampleTree = {
  NAV: {
    HOME: 'Accueil',
    SETTINGS: {
      TITLE: 'Paramètres',
      GENERAL: 'Général'
    }
  },
  COMMON: {
    SAVE: 'Enregistrer'
  }
};

const keys = extractKeys(sampleTree);
assert.deepStrictEqual(keys.sort(), [
  'COMMON.SAVE',
  'NAV.HOME',
  'NAV.SETTINGS.GENERAL',
  'NAV.SETTINGS.TITLE'
].sort(), 'extractKeys should return all dot-notated leaf keys');
console.log('✔ Test 1 passed: extractKeys extracts nested leaf keys correctly');

// 2. Test deleteNestedKey
const cloneTree = JSON.parse(JSON.stringify(sampleTree));
const deleted = deleteNestedKey(cloneTree, 'NAV.SETTINGS.GENERAL');
assert.strictEqual(deleted, true, 'deleteNestedKey should return true when key exists');
assert.strictEqual(cloneTree.NAV.SETTINGS.GENERAL, undefined, 'Key should be deleted');
assert.strictEqual(cloneTree.NAV.SETTINGS.TITLE, 'Paramètres', 'Sibling keys should remain intact');

const notDeleted = deleteNestedKey(cloneTree, 'NAV.SETTINGS.NON_EXISTING');
assert.strictEqual(notDeleted, false, 'deleteNestedKey should return false for nonexistent key');
console.log('✔ Test 2 passed: deleteNestedKey deletes target keys cleanly');

// 3. Test cleanEmptyObjects
cleanEmptyObjects(cloneTree);
assert.strictEqual(typeof cloneTree.NAV.SETTINGS, 'object', 'Parent with remaining siblings should not be deleted');

deleteNestedKey(cloneTree, 'NAV.SETTINGS.TITLE');
cleanEmptyObjects(cloneTree);
assert.strictEqual(cloneTree.NAV.SETTINGS, undefined, 'Empty parent object should be pruned recursively');
console.log('✔ Test 3 passed: cleanEmptyObjects recursively prunes empty object parents');

// 4. Test SAFELIST_PATTERNS
assert.strictEqual(SAFELIST_PATTERNS.some(p => p.test('COMMON.SAVE')), true, 'COMMON.* must be in safelist');
assert.strictEqual(SAFELIST_PATTERNS.some(p => p.test('DAYS.MONDAY')), true, 'DAYS.* must be in safelist');
assert.strictEqual(SAFELIST_PATTERNS.some(p => p.test('COMMANDES.STATUTS.PRET')), true, 'COMMANDES.STATUTS.* must be in safelist');
assert.strictEqual(SAFELIST_PATTERNS.some(p => p.test('RANDOM_OBSOLETE_KEY.FOO')), false, 'Arbitrary keys must not match safelist');
console.log('✔ Test 4 passed: SAFELIST_PATTERNS protects vital dynamic and core namespaces');

console.log('\n✅ All unit tests in test-prune-unused-i18n.js passed successfully!');
