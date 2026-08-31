# OpenBar — Architecture & Project Context

## Project Identity

**OpenBar** is a real-time bar management application designed to digitize the complete cycle: order intake → preparation → service → billing.

- **Repo**: `FunWarry/Open-Bar` (GitHub)
- **GitHub Project**: `PVT_kwHOBOlRss4Bac05`
- **Figma**: `XSVwFk64kgtqgUN9n5qoMw`
- **Target Deployment**: Local PWA on mini-PC / Raspberry Pi 5 over local bar Wi-Fi network (no internet dependency required for local operations)

---

## Technology Stack (Current)

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Backend | Spring Boot | 4.0.6 | |
| Runtime | Java | 22 (pinned) | Lombok 1.18.34 incompatible with JDK 23+ compiler internals |
| Database | PostgreSQL | — | Managed via Docker Compose |
| ORM | JPA/Hibernate + Lombok `@Data` | via Spring | |
| Security | Spring Security + custom JWT | JJWT 0.12.6 | Requires `JWT_SECRET` (≥ 32 characters) |
| Real-time | WebSocket STOMP | via Spring | 5 active topics |
| Frontend | Angular | 20 | |
| UI | Ionic | 8.8.11 | Angular Material abandoned |
| State | NgRx (store + effects) | 20 | **Auth only** — domain state uses services + signals |
| HTTP | RxJS / HttpClient | 7.8 | |
| i18n | Transloco (`@jsverse/transloco`) | — | All user-visible text must use `{{ 'KEY' | transloco }}` |
| Canvas | Konva.js | — | Interactive 2D floor plan |
| PDF | OpenPDF | 2.0.3 | Legal invoices, receipts, and table stand sheets |
| QR Codes | ZXing | 3.5.3 | High-contrast QR matrix generation (PNG, SVG, Wi-Fi standard schema) |
| Backend tests | JUnit 5 + Mockito + Testcontainers | — | Unit + Spring Boot integration tests with isolated PostgreSQL |
| Frontend tests | Karma + Jasmine | — | Headless browser unit tests |
| E2E tests | Playwright | 1.50+ | End-to-end browser tests (Chromium headless) |
| Database Backups | Automated Docker cron + rotation | — | `prodrigestivill/postgres-backup-local:15-alpine` (7d/4w/6m retention) |
| Reverse Proxy & TLS | Nginx | — | Port 443 HTTPS, TLS 1.2/1.3, HTTP 80 redirect, camera header, SAN certs |
| CI | GitHub Actions | 1 workflow (`ci.yml`) | Backend, Frontend, E2E, SonarCloud |
| Quality | SonarCloud + Qodana | — | Quality Gate enforcement |

---

## Backend Architecture

Strict layered pattern: **Controller → Service → Repository** (no layer skipping).

```
src/main/java/com/bar/gestioncocktail/
├── config/     # SecurityConfig, WebSocketConfig, JwtProperties, OpenApiConfig
├── controller/ # REST endpoints (@PreAuthorize mandatory on write endpoints)
├── service/    # Business domain logic (@Transactional on write methods)
├── repository/ # Spring Data JPA (extends JpaRepository<Entity, Long>)
├── model/      # JPA entities (@Data Lombok, @PrePersist/@PreUpdate)
├── dto/        # Java records with static XxxDTO from(Entity e)
└── security/   # JwtAuthenticationFilter, JwtAuthorizationFilter, JwtTokenProvider
```

**Secrets**: `JWT_SECRET` is required (≥ 256 bits) — defined in `.env` / environment variables, validated on startup via `JwtProperties.validate()`.

---

## Frontend Architecture

```
frontend/src/
├── app/
│   ├── app.routes.ts          # All routes lazy-loaded
│   ├── core/
│   │   ├── guards/            # AuthGuard, RoleGuard, AdminGuard
│   │   ├── interceptors/      # authInterceptor, errorInterceptor
│   │   ├── models/            # TypeScript interfaces
│   │   ├── services/          # Shared HTTP client services
│   │   └── store/             # NgRx (auth only: actions, effects, reducer, selectors)
│   └── features/
│       ├── auth/
│       ├── cocktails/
│       ├── commandes/
│       ├── dashboard-barman/
│       ├── dashboard-manager/
│       ├── dashboard-serveur/
│       ├── employees/             # Staff shift management + EmployeeShiftModalComponent
│       ├── factures/
│       ├── ingredients/
│       ├── schedule/              # Schedule view + ScheduleHistoryModal + ShiftHistoryModal (replay)
│       └── tables/
└── test/                      # Mirror structure of src/app/ — ALL *.spec.ts files located here
    ├── core/
    └── features/
```

**Key Architectural Decisions:**
- Angular Material → **Abandoned** → Ionic 8+
- Capacitor → **Abandoned** → PWA (`@angular/pwa`, Service Worker)
- NgRx → **Auth only** — all other state uses direct services + Angular signals
- Tests → **`src/test/`** (mirror Maven structure, never co-located with source components)
- Styling → **Adaptive Theme System** using CSS variables from `variables.css` (no hardcoded hex/RGB colors)

---

## Data Model

```
users ──< user_roles
users ──< employee_shifts              ← Staff shifts and schedules
employee_shifts ──< shift_audit_log    ← Immutable audit log (CREATED/UPDATED/DELETED)
users ──< tables (serveur_id)
tables ──< commandes ──< commande_items ──< cocktails
                                         └──< cocktail_variantes ──< cocktail_variante_ingredients ──< ingredients
                                                                 └── recipe_steps_json (mixology steps)
cocktails ──< cocktail_ingredients ──< ingredients
cocktails ──< cocktail_recipe_steps ──< recipe_step_templates
                                    └──< ingredients
cocktails >── glassware                 ← Service glass definition & capacity
tables ──< factures ──< facture_items
                    └──< facture_reglements       ← Persistent split settlement shares & receipt breakdown
tables ──< table_sessions              ← Client QR code temporary session
zones ──< tables                       ← Floor plan polygon coordinates
establishment_closures                 ← Exceptional closures & recurring holidays
shift_presets                          ← Predefined shift templates
week_schedule_publications             ← Weekly schedule publication log
users ──< audit_logs
app_settings                           ← Global admin customization singleton
```

---

## User Roles & Permissions

| Role | Domain Role | Key Permissions |
|------|-------------|-----------------|
| `ADMIN` | Technical maintenance & setup | User CRUD, full system access, app settings |
| `MANAGER` | Bar supervision (primary business role) | Analytics, order cancellation, stock toggle, shift & schedule management |
| `SERVEUR` | Order intake & table service | Create/cancel orders, table tracking, personal shift view, table billing/encaissement |
| `BARMAN` | Drink preparation & stock | Order status progression, cocktail/ingredient recipe view, stock outage toggles |

**NgRx Selectors**: `selectIsAdmin`, `selectIsManager`, `selectIsBarman`, `selectIsAuthenticated`, `selectCurrentUser`

---

## Order Lifecycle

```
EN_ATTENTE → EN_PREPARATION → PRET → LIVREE → REGLEE
                                            ↘ ANNULEE (any state)
```

---

## WebSocket STOMP Topics

| Topic | Event |
|-------|-------|
| `/topic/commandes` | New order created / order updated |
| `/topic/commandes/{id}` | Order status changed |
| `/topic/tables` | Table occupied / liberated / updated |
| `/topic/stock/alerte` | Low stock alert triggered |
| `/topic/schedule-publications` | Team schedule published |

---

## Audit & Replay Endpoints

| Method | URL | Roles | Description |
|--------|-----|-------|-------------|
| `GET` | `/api/shifts/{id}/history` | MANAGER, ADMIN | Immutable history of a single shift |
| `GET` | `/api/schedule/audit-log?week=&userId=` | MANAGER, ADMIN | Weekly schedule audit log (optional staff filter) |
| `GET` | `/api/schedule/at?week=&at=` | All authenticated | Time-travel replay reconstructing schedule at timestamp T |

---

## Running Locally

```bash
# Database
cd backend/src/main/resources && docker compose up -d

# Backend
export JWT_SECRET=$(openssl rand -base64 32)
cd backend && mvn spring-boot:run   # → http://localhost:8080

# Frontend
cd frontend && npm install && ng serve   # → http://localhost:4200
```

> ⚠️ **JDK 22 (pinned)** required — Lombok 1.18.34 is incompatible with JDK 23+ compiler internals.

---

## Database Backup & Disaster Recovery

OpenBar provides automated backups, configurable retention, and manual CLI utilities:

- **Automated Service**: `prodrigestivill/postgres-backup-local:15-alpine` container in `docker-compose.prod.yml`.
- **Scheduled Snapshot**: Cron `0 3 * * *` (03:00 daily), compressed with gzip (`.sql.gz`).
- **Retention Strategy**:
  - `BACKUP_KEEP_DAYS: 7` (daily backups kept for 7 days)
  - `BACKUP_KEEP_WEEKS: 4` (weekly backups kept for 4 weeks)
  - `BACKUP_KEEP_MONTHS: 6` (monthly backups kept for 6 months)
- **Persistent Volume**: `openbar_backups` mounted to `/backups`.
- **Manual Backup Script**: `scripts/backup-db.sh` (or `scripts/backup-db.ps1`) for on-demand snapshots.
- **Disaster Recovery Restore Script**: `scripts/restore-db.sh` (or `scripts/restore-db.ps1`) with archive integrity verification, automated pre-restore safety snapshot, connection draining, and post-restore sanity checks.

---

## Local HTTPS / TLS & PWA Reverse Proxy

Mobile browsers (iOS Safari, Android Chrome) enforce a secure context for `navigator.mediaDevices.getUserMedia` (QR code camera scanning) and Service Worker offline registration:

- **Nginx Reverse Proxy**: Port 443 with TLS 1.2/1.3, strong ciphers, and session cache (`docker-compose.prod.yml`).
- **HTTP Redirection**: Port 80 permanent 301 redirect to HTTPS.
- **Permissions Header**: `Permissions-Policy: camera=(self), microphone=(), geolocation=()` enabling camera feed.
- **Local Certificate Generation**: `scripts/generate-local-certs.sh` and `scripts/generate-local-certs.ps1` with Subject Alternative Names (SAN: `localhost`, `openbar.lan`, `*.openbar.lan`, `openbar.local`, `127.0.0.1`, LAN IP).
- **Zero-Config Fallback**: `frontend/entrypoint.sh` automatically generates fallback self-signed certificates if none are mounted.

---

## Quality & CI/CD Standards

1. **Documentation is mandatory** in English on all services, DTOs, controllers, guards, and store files.
2. **Never use `@SuppressWarnings`** — fix underlying code/lint warnings directly.
3. **No hardcoded text** — always use Transloco `fr.json` and `en.json` with 100% key parity.
4. **Adaptive theme** — use CSS variables for all styling (`var(--background-bg-0)`, `var(--primary)`, etc.).
