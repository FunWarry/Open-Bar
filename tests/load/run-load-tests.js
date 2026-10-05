#!/usr/bin/env node

/**
 * OpenBar Automated Load & Performance Test Runner.
 *
 * Supports local binary k6 execution or containerized Docker (grafana/k6).
 * Automatically boots and shuts down the ESC/POS thermal printer mock server.
 *
 * Usage:
 *   node tests/load/run-load-tests.js --scenario=smoke
 *   node tests/load/run-load-tests.js --scenario=rush-hour --url=http://localhost:8080
 *   node tests/load/run-load-tests.js --scenario=all
 */

import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const SCENARIOS = {
  smoke: 'tests/load/scenarios/smoke-test.js',
  'rush-hour': 'tests/load/scenarios/rush-hour-peak.js',
  websocket: 'tests/load/scenarios/websocket-stomp.js',
  'patron-cart': 'tests/load/scenarios/patron-cart.js',
  billing: 'tests/load/scenarios/billing-print.js',
  full: 'tests/load/scenarios/full-service-simulation.js',
};

// Parse command line arguments
const args = process.argv.slice(2);
let selectedScenario = 'smoke';
let targetUrl = process.env.BASE_URL || 'http://localhost:8080';
let useDocker = false;

for (const arg of args) {
  if (arg.startsWith('--scenario=')) {
    selectedScenario = arg.split('=')[1].trim();
  } else if (arg.startsWith('--url=')) {
    targetUrl = arg.split('=')[1].trim();
  } else if (arg === '--docker') {
    useDocker = true;
  }
}

function resolveBinary(cmd) {
  if (process.platform === 'win32' && cmd === 'k6') {
    const defaultWinPath = String.raw`C:\Program Files\k6\k6.exe`;
    if (fs.existsSync(defaultWinPath)) {
      return defaultWinPath;
    }
  }
  try {
    const isWin = process.platform === 'win32';
    const checkCmd = isWin ? `where.exe ${cmd}` : `which ${cmd}`;
    const output = execSync(checkCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (output) {
      const paths = output.split(/\r?\n/).map((p) => p.trim());
      return paths.find(Boolean) || cmd;
    }
  } catch (_ignored) {
    // Binary not found in PATH query
  }
  return cmd;
}

function hasBinary(cmd) {
  const resolved = resolveBinary(cmd);
  return resolved !== cmd;
}

function runK6(scenarioRelPath, url, withDocker) {
  return new Promise((resolve) => {
    const currentDir = import.meta.dirname || path.resolve('.');
    const rootDir = path.resolve(currentDir, '..', '..');
    const normalizedPath = scenarioRelPath.replaceAll('\\', '/');

    let proc;
    if (withDocker) {
      // Use Docker container
      const dockerBin = resolveBinary('docker');
      let dockerUrl = url;
      const dockerArgs = ['run', '--rm', '-i'];

      if (process.platform === 'win32') {
        dockerUrl = url.replaceAll('localhost', 'host.docker.internal').replaceAll('127.0.0.1', 'host.docker.internal');
        dockerArgs.push('--add-host=host.docker.internal:host-gateway');
      } else {
        dockerArgs.push('--net=host');
      }

      dockerArgs.push(
        '-v', `${rootDir}:/work`,
        '-w', '/work',
        '-e', `BASE_URL=${dockerUrl}`,
        'grafana/k6:latest',
        'run',
        normalizedPath
      );
      proc = spawn(dockerBin, dockerArgs, { stdio: 'inherit', shell: false });
    } else {
      // Use local k6
      const k6Bin = resolveBinary('k6');
      proc = spawn(k6Bin, ['run', '-e', `BASE_URL=${url}`, normalizedPath], {
        stdio: 'inherit',
        cwd: rootDir,
        shell: false,
      });
    }

    proc.on('close', (code) => {
      resolve(code || 0);
    });

    proc.on('error', (err) => {
      console.error(`Failed to launch runner: ${err.message}`);
      resolve(1);
    });
  });
}

async function main() {
  console.log('='.repeat(70));
  console.log('🚀 OpenBar Load & Stress Testing Orchestrator');
  console.log(`🎯 Scenario: ${selectedScenario}`);
  console.log(`🌐 Target Base URL: ${targetUrl}`);
  console.log('='.repeat(70));

  // Determine runner mode
  const localK6 = hasBinary('k6');
  const hasDocker = hasBinary('docker');

  if (!localK6 && !hasDocker && !useDocker) {
    console.error('❌ Neither local `k6` nor `docker` was found in PATH.');
    console.error('   Please install k6 (https://k6.io/docs/get-started/installation/) or run Docker.');
    process.exit(1);
  }

  const runWithDocker = useDocker || (!localK6 && hasDocker);
  console.log(`⚙️  Execution engine: ${runWithDocker ? 'Docker (grafana/k6)' : 'Local k6 binary'}`);

  // Start mock ESC/POS server
  console.log('🖨️  Starting background Mock ESC/POS socket server on port 9100...');
  const currentDir = import.meta.dirname || path.resolve('.');
  const mockServerPath = path.resolve(currentDir, 'helpers', 'mock-escpos-server.js');
  const mockServerProc = spawn(process.execPath, [mockServerPath], {
    stdio: 'inherit',
    detached: false,
    shell: false,
  });

  // Ensure mock server cleanup on exit
  const cleanup = () => {
    try {
      mockServerProc.kill('SIGTERM');
    } catch (_ignored) {
      // Process already terminated
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(1); });
  process.on('SIGTERM', () => { cleanup(); process.exit(1); });

  // Brief pause for mock server to bind
  await new Promise((r) => setTimeout(r, 600));

  const scenariosToRun = selectedScenario === 'all'
    ? Object.keys(SCENARIOS)
    : [selectedScenario];

  let anyFailure = false;

  for (const scenName of scenariosToRun) {
    const scenFile = SCENARIOS[scenName];
    if (!scenFile) {
      console.error(`❌ Unknown scenario: ${scenName}. Available: ${Object.keys(SCENARIOS).join(', ')}, all`);
      cleanup();
      process.exit(1);
    }

    console.log(`\n▶️ Running scenario: [${scenName}] (${scenFile})`);

    const code = await runK6(scenFile, targetUrl, runWithDocker);
    if (code !== 0) {
      console.error(`❌ Scenario [${scenName}] failed with exit code ${code}`);
      anyFailure = true;
    } else {
      console.log(`✅ Scenario [${scenName}] completed successfully.`);
    }
  }

  cleanup();
  console.log('\n' + '='.repeat(70));
  if (anyFailure) {
    console.error('❌ One or more load testing scenarios did not meet KPI thresholds.');
    process.exit(1);
  } else {
    console.log('🎉 All load test scenarios completed successfully and met all thresholds!');
    process.exit(0);
  }
}

await main();
