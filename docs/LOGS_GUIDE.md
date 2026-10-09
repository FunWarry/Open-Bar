# 📋 Logging & Log Management Guide — OpenBar

This document specifies the centralized logging architecture of **OpenBar**, the technical purpose and operation of the **Logrotate** service, practical procedures for accessing real-time and archived logs, and operational troubleshooting.

---

## 1. Logging Architecture Overview

In OpenBar's production environments (whether deployed on a local Raspberry Pi 5 or an on-premise mini-PC), container logs are managed centrally through a persistent Docker volume:

```
Docker Volume (openbar_logs / openbar_logs_rpi5)
 └── /var/log/openbar/
      ├── backend/       # Spring Boot application logs (Logback engine)
      │    ├── spring.log
      │    └── spring.log.1.gz
      ├── frontend/      # Nginx reverse proxy HTTP access & error logs
      │    ├── access.log
      │    └── error.log
      └── postgres/      # PostgreSQL 15 database engine logs (stderr & CSV)
           └── postgresql-YYYY-MM-DD_HHMMSS.log
```

### Component Breakdown

| Component | Logging Engine | Production Level | Output Channels |
|-----------|----------------|------------------|-----------------|
| **Backend** | Spring Boot / Logback | `INFO` (`WARN` for security) | Container stdout + `/var/log/openbar/backend/spring.log` |
| **Frontend** | Nginx Alpine | `info` / `warn` | Container stdout/stderr + `/var/log/openbar/frontend/` |
| **PostgreSQL** | PostgreSQL 15 Engine | `warning` | Container stderr + rotating CSV files in `/var/log/openbar/postgres/` |
| **Logrotate** | Alpine Linux daemon | Hourly cron cycle | Monitors and rotates files within `/var/log/openbar/` |

---

## 2. What is Logrotate and Why is it Mandatory?

### The Constrained On-Premise Hardware Context (Raspberry Pi 5 / Mini-PC)
OpenBar is engineered to run **24/7 on-premise** on local establishment hardware (bars, nightclubs, bistros) without cloud dependence. Such devices typically rely on limited flash or solid-state storage (e.g., 32GB to 128GB MicroSD, eMMC, or compact NVMe SSDs).

In an active venue:
- Hundreds of drink orders, patron cart changes, server call alerts, and STOMP WebSocket frames are transmitted every hour.
- Continuous HTTP access logs from Nginx, JDBC queries from PostgreSQL, and application events from Spring Boot produce an ongoing write stream.

### Risks Without Automated Log Rotation
1. **Disk Exhaustion (100% full partition)**: Within a few weeks—or days during high-throughput rush events—the storage device reaches full capacity.
2. **Abrupt Database Engine Shutdown**: When storage is depleted, PostgreSQL enters an emergency read-only state or crashes completely (`PANIC: could not write to file ... No space left on device`).
3. **Severe Service Disruption**: POS billing, bartender KDS displays, and waiter tablets freeze during active guest service.
4. **Flash Memory Degradation**: Unbounded, excessive write cycles prematurely wear out MicroSD or eMMC storage cells.

### How the Rotation Policy Operates (`openbar.logrotate`)

The dedicated `logrotate` container applies the following declarative policy:

```
/var/log/openbar/backend/*.log
/var/log/openbar/frontend/*.log
/var/log/openbar/postgres/*.log
/var/log/openbar/postgres/*.csv
/var/log/openbar/*/*.log
{
    daily
    rotate 14
    maxsize 10M
    missingok
    notifempty
    compress
    delaycompress
    copytruncate
    create 0666 root root
}
```

* **`daily` & `maxsize 10M`**: A log file is rotated daily, OR immediately whenever it reaches 10MB (safeguarding against sudden volume bursts during rush hours).
* **`rotate 14`**: A maximum of 14 rotated archives are retained. Older archives are automatically pruned.
* **`compress` & `delaycompress`**: Archived logs are compressed using `gzip`, reducing storage consumption by approximately 85%–90%.
* **`copytruncate` (Zero-Downtime Rotation)**: The active log file is copied and truncated in-place without stopping the writing process. Neither the Java JVM nor Nginx needs a restart.
* **Minimal Footprint**: The `logrotate` container runs with a strict **64MB RAM limit** and checks disk volumes every hour.

---

## 3. How to Access and Inspect Logs

### Method 1: Using the PowerShell Manager Script (Recommended)

The [`scripts/manage-docker-app.ps1`](../scripts/manage-docker-app.ps1) script automatically detects whether the Raspberry Pi 5 simulation stack or standard production stack is active:

```powershell
# Interactive Menu:
.\scripts\manage-docker-app.ps1
# Select option 10 (View container logs), then choose the target service.

# Direct CLI Commands:
.\scripts\manage-docker-app.ps1 -Action logs
.\scripts\manage-docker-app.ps1 -Action logs -Service backend
.\scripts\manage-docker-app.ps1 -Action logs -Service frontend
.\scripts\manage-docker-app.ps1 -Action logs -Service postgres
```

### Method 2: Docker Compose CLI Streaming

For the Raspberry Pi 5 simulator stack:
```powershell
# Stream all services in real time:
docker compose -f docker/docker-compose.rpi5-sim.yml logs -f --tail=100

# Stream backend only:
docker compose -f docker/docker-compose.rpi5-sim.yml logs -f backend
```

For the standard production stack:
```powershell
docker compose -f docker-compose.prod.yml logs -f --tail=100
```

### Method 3: Direct Container Commands

```powershell
# Backend logs (Spring Boot):
docker logs -f openbar-rpi5-sim-backend-1

# Frontend logs (Nginx / Web PWA):
docker logs -f openbar-rpi5-sim-frontend-1

# Database logs (PostgreSQL):
docker logs -f openbar-rpi5-sim-postgres-1

# Log rotation service status:
docker logs -f openbar-rpi5-sim-logrotate-1
```

### Method 4: Inspecting Persistent Volume Files

To review raw log files or compressed past archives directly on the filesystem:

```powershell
# List all backend log files:
docker exec -it openbar-rpi5-sim-backend-1 ls -la /var/log/openbar/backend

# Follow current backend log:
docker exec -it openbar-rpi5-sim-backend-1 tail -f /var/log/openbar/backend/spring.log

# Read a compressed historical log without extracting to disk:
docker exec -it openbar-rpi5-sim-backend-1 zcat /var/log/openbar/backend/spring.log.1.gz | more
```

---

## 4. Production Behavior & Troubleshooting FAQ

### 1. Why does `http://localhost:8080/swagger-ui.html` return a 404 in production?
* **Intentional Security Hardening**: Swagger UI and raw OpenAPI descriptors (`springdoc.swagger-ui.enabled: false`, `springdoc.api-docs.enabled: false`) are intentionally disabled in the `prod` profile to avoid exposing system internals and endpoints to unauthorized callers on the venue network.
* Swagger UI is exclusively available in `dev` and `test` environments.

### 2. Why does `GET /api/cocktails` return an empty list (`[]`) on initial production startup?
* **Clean Establishment State**: In `prod` and `staging` profiles, automatic mock data seeding is skipped on startup (`seedDemoDataIfEmpty` is inactive). The establishment starts with a pristine database ready for setup wizard configuration.
* To seed demo data on demand for evaluation:
  * Complete the initial onboarding wizard at `/setup`, or
  * Trigger `POST /api/setup/seed-demo` using authorized manager credentials.
