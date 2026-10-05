# OpenBar — Load Testing & Network Resiliency Suite (#448)

This directory contains the automated performance benchmarking, rush-hour stress testing, and degraded network resiliency validation suite for OpenBar.

---

## 🎯 Target KPIs & Performance Criteria

| Metric | Target SLA | Rush Hour Peak Target |
|--------|------------|------------------------|
| **API Response Time (p95)** | `< 80 ms` | `< 120 ms` under extreme spike |
| **WebSocket STOMP Broadcast (p95)** | `< 150 ms` | `< 200 ms` |
| **Transaction Loss during Network Partition** | **0% (Zero)** | **0% (Zero)** |
| **HTTP Error Rate** | `< 1%` | `< 2%` |
| **JVM Full GC Pauses (FGC)** | `0 pauses` | `0 pauses` |
| **HikariCP Connection Pool Saturation** | `< 80% peak` | Connection timeout: `0` |

---

## 📂 Architecture & Directory Layout

```
tests/load/
├── run-load-tests.js               # Multi-runner CLI (auto-detects local k6 or Docker)
├── scenarios/
│   ├── smoke-test.js               # Fast 15s smoke benchmark for CI
│   ├── rush-hour-peak.js           # Friday/Saturday night peak rush hour (40+ tables, 10 waitstaff)
│   ├── websocket-stomp.js          # High-concurrency STOMP WebSocket benchmark
│   ├── patron-cart.js              # Collaborative patron table cart stress
│   ├── billing-print.js            # Concurrent billing settlements & ESC/POS socket prints
│   └── full-service-simulation.js  # Global orchestrator simulating all personas simultaneously
├── helpers/
│   ├── auth.js                     # JWT authentication and bearer header caching
│   ├── stomp-ws.js                 # STOMP 1.2 frame builder and parser for k6/ws
│   └── mock-escpos-server.js       # Lightweight TCP server on port 9100 absorbing thermal prints
├── README.md                       # Execution guide and architecture documentation
└── BENCHMARK_REPORT.md             # Benchmark analysis, bottlenecks & server tuning guide
```

---

## 🚀 Running Load Tests

### 1. Prerequisites
You need either:
- **`k6` installed locally** ([Installation Guide](https://k6.io/docs/get-started/installation/)), OR
- **`docker` running** (the runner will automatically execute inside `grafana/k6:latest`).

The mock ESC/POS thermal printer server (port 9100) is **automatically launched and stopped** by the test runner.

### 2. Fast Smoke Test (15s — Suitable for CI)
```bash
node tests/load/run-load-tests.js --scenario=smoke
```

### 3. Rush Hour Peak Service Simulation
```bash
node tests/load/run-load-tests.js --scenario=rush-hour --url=http://localhost:8080
```

### 4. High-Throughput WebSocket STOMP Benchmark
```bash
node tests/load/run-load-tests.js --scenario=websocket --url=http://localhost:8080
```

### 5. Collaborative Patron Cart Benchmark
```bash
node tests/load/run-load-tests.js --scenario=patron-cart --url=http://localhost:8080
```

### 6. Billing Settlement & Thermal Printing Stress
```bash
node tests/load/run-load-tests.js --scenario=billing --url=http://localhost:8080
```

### 7. Run Entire Performance Suite
```bash
node tests/load/run-load-tests.js --scenario=all --url=http://localhost:8080
```

---

## 🍓 Raspberry Pi 5 / Mini-PC Simulation Environment

To validate OpenBar under actual on-premise hardware constraints (4 vCPU cores, 2GB–4GB RAM):

```bash
# Start constrained environment reproducing Raspberry Pi 5 specs:
docker compose -f docker/docker-compose.rpi5-sim.yml up -d

# Run load test in the simulated environment:
node tests/load/run-load-tests.js --scenario=rush-hour --url=http://localhost:8080
```

---

## 📊 Hardware & JVM GC Telemetry Profiling

Run the profiler during any benchmark run to capture real-time CPU, RAM, and JDK 22 garbage collector pauses:

```bash
node scripts/benchmark-profile.js --duration=60 --output=tests/load/profile-summary.json
```

---

## 🌐 Degraded Network & Resiliency Simulation (Playwright)

Validates client-side IndexedDB order queueing (`OfflineOrderService`), zero-loss background flushing, and WebSocket auto-reconnect resilience under throttled network conditions (latency spikes 100ms–2000ms, packet drops):

```bash
cd frontend && npx playwright test e2e/commandes/degraded-network-resilience.spec.ts
```
