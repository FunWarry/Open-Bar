/**
 * OpenBar — Automated Verification Suite for Database Backup & Restore System
 * Tests script existence, structure, parameter definitions, docker-compose configuration,
 * and compression round-trip.
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(ROOT_DIR, 'scripts');
const PROD_COMPOSE = path.join(ROOT_DIR, 'docker-compose.prod.yml');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    process.stdout.write(`Testing: ${name}... `);
    fn();
    console.log('\x1b[32mPASSED\x1b[0m');
    passedTests++;
  } catch (err) {
    console.log('\x1b[31mFAILED\x1b[0m');
    console.error(`  -> Error: ${err.message}`);
    failedTests++;
  }
}

console.log('=================================================================');
console.log('   OpenBar Backup & Disaster Recovery Verification Test Suite   ');
console.log('=================================================================\n');

// 1. Check Docker Compose configuration
runTest('Validate docker-compose.prod.yml backup service and volume definitions', () => {
  if (!fs.existsSync(PROD_COMPOSE)) {
    throw new Error(`docker-compose.prod.yml not found at ${PROD_COMPOSE}`);
  }
  const content = fs.readFileSync(PROD_COMPOSE, 'utf8');
  if (!content.includes('backup:')) {
    throw new Error('backup service is missing from docker-compose.prod.yml');
  }
  if (!content.includes('image: prodrigestivill/postgres-backup-local:15-alpine')) {
    throw new Error('backup service does not use prodrigestivill/postgres-backup-local:15-alpine image');
  }
  if (!content.includes('openbar_backups:/backups')) {
    throw new Error('openbar_backups volume mount missing from backup service');
  }
  if (!content.includes('openbar_backups:')) {
    throw new Error('openbar_backups volume declaration missing from top-level volumes');
  }
  if (!content.includes('BACKUP_KEEP_DAYS') || !content.includes('BACKUP_KEEP_WEEKS') || !content.includes('BACKUP_KEEP_MONTHS')) {
    throw new Error('Retention policies (days/weeks/months) missing from backup service');
  }
  if (!content.includes('condition: service_healthy')) {
    throw new Error('backup service must depend on postgres service_healthy');
  }
});

// 2. Check script existence and non-empty content
runTest('Verify backup and restore scripts exist and are non-empty', () => {
  const requiredFiles = [
    'backup-db.sh',
    'restore-db.sh',
    'backup-db.ps1',
    'restore-db.ps1'
  ];
  for (const file of requiredFiles) {
    const fullPath = path.join(SCRIPTS_DIR, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing script: ${file}`);
    }
    const stat = fs.statSync(fullPath);
    if (stat.size === 0) {
      throw new Error(`Script is empty: ${file}`);
    }
  }
});

// 3. Test bash scripts structural requirements
runTest('Verify bash scripts structure and flags', () => {
  const backupSh = fs.readFileSync(path.join(SCRIPTS_DIR, 'backup-db.sh'), 'utf8');
  const restoreSh = fs.readFileSync(path.join(SCRIPTS_DIR, 'restore-db.sh'), 'utf8');

  if (!backupSh.includes('set -eo pipefail') || !restoreSh.includes('set -eo pipefail')) {
    throw new Error('Bash scripts must enforce set -eo pipefail for safety');
  }
  if (!backupSh.includes('gzip -9') || !backupSh.includes('gzip -t')) {
    throw new Error('backup-db.sh must use gzip compression and integrity validation');
  }
  if (!restoreSh.includes('pg_terminate_backend') || !restoreSh.includes('gzip -t')) {
    throw new Error('restore-db.sh must verify archive integrity and drain active connections');
  }
  if (!restoreSh.includes('pre_restore_safety_')) {
    throw new Error('restore-db.sh must include pre-restore safety snapshot creation');
  }
});

// 4. Test PowerShell scripts structural requirements
runTest('Verify PowerShell scripts structure and parameters', () => {
  const backupPs = fs.readFileSync(path.join(SCRIPTS_DIR, 'backup-db.ps1'), 'utf8');
  const restorePs = fs.readFileSync(path.join(SCRIPTS_DIR, 'restore-db.ps1'), 'utf8');

  if (!backupPs.includes('[CmdletBinding()]') || !restorePs.includes('[CmdletBinding()]')) {
    throw new Error('PowerShell scripts must declare [CmdletBinding()]');
  }
  if (!backupPs.includes('$ErrorActionPreference = "Stop"') || !restorePs.includes('$ErrorActionPreference = "Stop"')) {
    throw new Error('PowerShell scripts must enforce $ErrorActionPreference = "Stop"');
  }
  if (!backupPs.includes('System.IO.Compression.GZipStream') || !restorePs.includes('System.IO.Compression.GZipStream')) {
    throw new Error('PowerShell scripts must support GZip compression streams');
  }
});

// 5. Test Gzip Compression and Decompression integrity roundtrip
runTest('Verify SQL gzip compression and decompression integrity roundtrip', () => {
  const sampleSql = '-- OpenBar Test Dump\nCREATE TABLE test (id SERIAL PRIMARY KEY, name VARCHAR(255));\nINSERT INTO test (name) VALUES (\'Mojito\');\n';
  const compressed = zlib.gzipSync(Buffer.from(sampleSql, 'utf8'));
  const decompressed = zlib.gunzipSync(compressed).toString('utf8');
  
  if (decompressed !== sampleSql) {
    throw new Error('Decompressed SQL content did not match original input.');
  }
});

// 6. Test documentation synchronization
runTest('Verify backup and restore documentation in README and Knowledge Base', () => {
  const readme = fs.readFileSync(path.join(ROOT_DIR, 'README.md'), 'utf8');
  const arch = fs.readFileSync(path.join(ROOT_DIR, '.agents/knowledge/architecture.md'), 'utf8');
  const features = fs.readFileSync(path.join(ROOT_DIR, '.agents/knowledge/features-state.md'), 'utf8');

  if (!readme.includes('Sauvegardes & Restauration de la Base de Données')) {
    throw new Error('README.md missing Sauvegardes & Restauration section');
  }
  if (!arch.includes('Database Backup & Disaster Recovery')) {
    throw new Error('architecture.md missing Database Backup & Disaster Recovery section');
  }
  if (!features.includes('Sauvegardes PostgreSQL & Rétention Automatisée (#337)')) {
    throw new Error('features-state.md missing feature row for #337');
  }
});

console.log('\n-----------------------------------------------------------------');
console.log(`Results: ${passedTests} passed, ${failedTests} failed.`);
console.log('=================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
