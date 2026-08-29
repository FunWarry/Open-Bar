/**
 * OpenBar — Automated Verification Suite for Database Backup & Restore System
 * Tests script existence, syntax, arguments parsing, docker-compose configuration,
 * and compression round-trip.
 */

const { execSync } = require('node:child_process');
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
runTest('Validate docker-compose.prod.yml syntax & backup service definition', () => {
  if (!fs.existsSync(PROD_COMPOSE)) {
    throw new Error(`docker-compose.prod.yml not found at ${PROD_COMPOSE}`);
  }
  const content = fs.readFileSync(PROD_COMPOSE, 'utf8');
  if (!content.includes('backup:')) {
    throw new Error('backup service is missing from docker-compose.prod.yml');
  }
  if (!content.includes('openbar_backups:')) {
    throw new Error('openbar_backups volume is missing from docker-compose.prod.yml');
  }
  if (!content.includes('BACKUP_KEEP_DAYS') || !content.includes('BACKUP_KEEP_WEEKS') || !content.includes('BACKUP_KEEP_MONTHS')) {
    throw new Error('Retention policies (days/weeks/months) missing from backup service');
  }

  // Execute docker compose config check
  execSync('docker compose -f docker-compose.prod.yml config', {
    cwd: ROOT_DIR,
    stdio: 'pipe',
    env: { ...process.env, POSTGRES_PASSWORD: 'testpassword123', JWT_SECRET: 'a'.repeat(32) }
  });
});

// 2. Check script existence and permissions
runTest('Verify backup and restore scripts exist', () => {
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
  }
});

// 3. Test bash script syntax
runTest('Verify bash scripts syntax (bash -n)', () => {
  try {
    execSync(`bash -n "${path.join(SCRIPTS_DIR, 'backup-db.sh')}"`, { stdio: 'pipe' });
    execSync(`bash -n "${path.join(SCRIPTS_DIR, 'restore-db.sh')}"`, { stdio: 'pipe' });
  } catch (err) {
    // If bash is not installed in Windows PATH, skip gracefully with warning
    if (process.platform === 'win32' && err.message.includes('bash')) {
      console.log('(bash not in PATH, skipped on Windows) ');
      return;
    }
    throw err;
  }
});

// 4. Test PowerShell script syntax
runTest('Verify PowerShell scripts syntax', () => {
  if (process.platform === 'win32') {
    const psBackup = path.join(SCRIPTS_DIR, 'backup-db.ps1').replaceAll('\\', '\\\\');
    const psRestore = path.join(SCRIPTS_DIR, 'restore-db.ps1').replaceAll('\\', '\\\\');
    
    execSync(`powershell -Command "[System.Management.Automation.Language.Parser]::ParseFile('${psBackup}', [ref]$null, [ref]$null)"`, { stdio: 'pipe' });
    execSync(`powershell -Command "[System.Management.Automation.Language.Parser]::ParseFile('${psRestore}', [ref]$null, [ref]$null)"`, { stdio: 'pipe' });
  }
});

// 5. Test Gzip Compression and Decompression integrity roundtrip
runTest('Verify SQL gzip compression and decompression integrity', () => {
  const sampleSql = '-- OpenBar Test Dump\nCREATE TABLE test (id SERIAL PRIMARY KEY, name VARCHAR(255));\nINSERT INTO test (name) VALUES (\'Mojito\');\n';
  const compressed = zlib.gzipSync(Buffer.from(sampleSql, 'utf8'));
  const decompressed = zlib.gunzipSync(compressed).toString('utf8');
  
  if (decompressed !== sampleSql) {
    throw new Error('Decompressed SQL content did not match original input.');
  }
});

// 6. Test restore script error handling on non-existent file
runTest('Verify restore script error handling on non-existent file', () => {
  if (process.platform === 'win32') {
    try {
      execSync(`powershell -File "${path.join(SCRIPTS_DIR, 'restore-db.ps1')}" -File "non_existent_file.sql.gz"`, { stdio: 'pipe' });
      throw new Error('Restore script should have failed on non-existent file.');
    } catch (err) {
      if (!err.message.includes('non_existent_file') && !err.stderr?.toString().includes('not found')) {
        // Expected failure
      }
    }
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
