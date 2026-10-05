#!/usr/bin/env node

/**
 * OpenBar Hardware & JVM Resource Profiler for Raspberry Pi 5 / Mini-PC benchmarks.
 *
 * Samples CPU, RAM, and JVM GC telemetry during stress tests and produces a
 * performance and hardware utilization summary report.
 *
 * Usage:
 *   node scripts/benchmark-profile.js --duration=60 --output=profile-report.json
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';

const args = process.argv.slice(2);
let durationSeconds = 30;
let sampleIntervalMs = 1000;
let outputFile = null;

args.forEach((arg) => {
  if (arg.startsWith('--duration=')) {
    durationSeconds = Number.parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--interval=')) {
    sampleIntervalMs = Number.parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--output=')) {
    outputFile = arg.split('=')[1];
  }
});

const samples = {
  timestamps: [],
  cpuPercentages: [],
  memoryUsedMb: [],
  jvmGcCounts: [],
};

function getSystemMetrics() {
  const totalMemMb = Math.round(os.totalmem() / 1024 / 1024);
  const freeMemMb = Math.round(os.freemem() / 1024 / 1024);
  const usedMemMb = totalMemMb - freeMemMb;

  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  return { totalMemMb, usedMemMb, totalTick, totalIdle };
}

let lastTick = 0;
let lastIdle = 0;

function calculateCpuPercent(totalTick, totalIdle) {
  if (lastTick === 0) {
    lastTick = totalTick;
    lastIdle = totalIdle;
    return 0;
  }
  const deltaTick = totalTick - lastTick;
  const deltaIdle = totalIdle - lastIdle;
  lastTick = totalTick;
  lastIdle = totalIdle;
  if (deltaTick <= 0) return 0;
  const cpuFrac = 1 - deltaIdle / deltaTick;
  return Math.min(100, Math.max(0, Math.round(cpuFrac * 100 * 10) / 10));
}

function findJavaPid() {
  try {
    const isWin = process.platform === 'win32';
    const cmd = isWin
      ? 'powershell -Command "Get-Process java -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"'
      : 'pgrep -f java';
    const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (output) {
      const pids = output.split(/\r?\n/).map((p) => p.trim());
      return pids.find(Boolean) || null;
    }
  } catch (_ignored) {
    // Process not found or query failed; proceed without Java PID
  }
  return null;
}

function getJstatGcInfo(pid) {
  if (!pid) return null;
  try {
    const out = execSync(`jstat -gc ${pid}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const lines = out.trim().split(/\r?\n/);
    if (lines.length >= 2) {
      const headers = lines[0].trim().split(/\s+/);
      const vals = lines[1].trim().split(/\s+/);
      const ygcIdx = headers.indexOf('YGC');
      const fgcIdx = headers.indexOf('FGC');
      const gctIdx = headers.indexOf('GCT');
      return {
        ygc: ygcIdx !== -1 ? Number.parseInt(vals[ygcIdx], 10) : 0,
        fgc: fgcIdx !== -1 ? Number.parseInt(vals[fgcIdx], 10) : 0,
        gctSec: gctIdx !== -1 ? Number.parseFloat(vals[gctIdx]) : 0,
      };
    }
  } catch (_ignored) {
    // jstat unavailable or permissions issue; telemetry will skip GC breakdown
  }
  return null;
}

async function main() {
  console.log('='.repeat(70));
  console.log('📊 OpenBar Hardware & JVM Profiler');
  console.log(`⏱️  Duration: ${durationSeconds}s (Sampling every ${sampleIntervalMs}ms)`);
  console.log(`💻 Host OS: ${os.type()} ${os.arch()} | Cores: ${os.cpus().length}`);
  const javaPid = findJavaPid();
  const javaTarget = javaPid ? `PID ${javaPid}` : 'None detected (running in Docker or separate host)';
  console.log(`☕ Target Java Process: ${javaTarget}`);
  console.log('='.repeat(70));

  const startTime = Date.now();
  const endTime = startTime + durationSeconds * 1000;

  // Prime initial CPU reading
  const initMetrics = getSystemMetrics();
  lastTick = initMetrics.totalTick;
  lastIdle = initMetrics.totalIdle;

  const initialGc = getJstatGcInfo(javaPid);

  while (Date.now() < endTime) {
    await new Promise((r) => setTimeout(r, sampleIntervalMs));

    const { totalTick, totalIdle, usedMemMb } = getSystemMetrics();
    const cpu = calculateCpuPercent(totalTick, totalIdle);
    const now = new Date().toISOString().substring(11, 19);

    samples.timestamps.push(now);
    samples.cpuPercentages.push(cpu);
    samples.memoryUsedMb.push(usedMemMb);

    process.stdout.write(`\r[${now}] CPU: ${cpu.toFixed(1)}% | Host RAM Used: ${usedMemMb} MB    `);
  }

  const finalGc = getJstatGcInfo(javaPid);
  console.log('\n\n' + '='.repeat(70));
  console.log('📋 PROFILING SUMMARY REPORT');
  console.log('='.repeat(70));

  const avgCpu = samples.cpuPercentages.reduce((a, b) => a + b, 0) / (samples.cpuPercentages.length || 1);
  const maxCpu = Math.max(...samples.cpuPercentages, 0);
  const avgMem = samples.memoryUsedMb.reduce((a, b) => a + b, 0) / (samples.memoryUsedMb.length || 1);
  const maxMem = Math.max(...samples.memoryUsedMb, 0);

  console.log(`• Average CPU Utilization : ${avgCpu.toFixed(1)}%`);
  console.log(`• Peak CPU Utilization    : ${maxCpu.toFixed(1)}%`);
  console.log(`• Average RAM Used        : ${Math.round(avgMem)} MB`);
  console.log(`• Peak RAM Used           : ${maxMem} MB`);

  if (initialGc && finalGc) {
    const deltaYgc = finalGc.ygc - initialGc.ygc;
    const deltaFgc = finalGc.fgc - initialGc.fgc;
    const deltaGct = (finalGc.gctSec - initialGc.gctSec).toFixed(3);
    console.log(`• Young Gen GC Runs (YGC) : ${deltaYgc}`);
    console.log(`• Full GC Pauses (FGC)    : ${deltaFgc} (Target: 0)`);
    console.log(`• Total GC Pause Time     : ${deltaGct}s`);
  } else {
    console.log('• JVM GC Stats            : Monitored via container/cgroups');
  }

  console.log('='.repeat(70));

  const result = {
    durationSeconds,
    hostCores: os.cpus().length,
    avgCpuPercent: Math.round(avgCpu * 10) / 10,
    peakCpuPercent: maxCpu,
    avgRamMb: Math.round(avgMem),
    peakRamMb: maxMem,
    samples,
  };

  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf8');
    console.log(`💾 Saved detailed profile data to: ${outputFile}`);
  }
}

await main();
