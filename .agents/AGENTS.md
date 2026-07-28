# OpenBar — Rules & Context for AI Agents

This file is read automatically by Antigravity (and compatible agents) when working in this workspace.
It defines project rules, workflow constraints, and key context that must be respected at all times.

---

## Project Overview

**OpenBar** is a real-time bar management PWA:
- **Serveurs** take orders via a floor plan (Konva.js)
- **Barmans** prepare orders via a real-time kanban
- **Managers** supervise stats, billing, and floor plan
- **Clients** browse the menu and order via QR code scan

Deployed as a PWA on a local WiFi network (Raspberry Pi 5 / mini-PC). No internet dependency.

---

## Stack (do not assume — these are the real versions)

| Layer | Technology | Version | Critical note |
|-------|------------|---------|---------------|
| Backend | Spring Boot | **4.0.6** | |
| Runtime | Java | **22 (pinned)** | ⚠️ Lombok 1.18.34 breaks on JDK 23+ — no getters/setters generated |
| Security | Spring Security + JWT | JJWT 0.12.6 | `JWT_SECRET` env var required (≥ 32 chars) |
| PDF | OpenPDF | 2.0.3 | |
| WebSocket | STOMP | via Spring | 4 active topics |
| Frontend | Angular | **20** | |
| UI | **Ionic** | **8.8.11** | Angular Material is ABANDONED — never use it |
| State | NgRx | 20 | Auth store only — business state = services + signals |
| i18n | Transloco | — | All text must use `{{ 'KEY' | transloco }}` — no hardcoded FR |
| Deployment | PWA + Service Worker | — | Capacitor is ABANDONED |

---

## Absolute Rules

### Backend
1. **Never `@Autowired` on a field** — always constructor injection
2. **Never return JPA entities** from controllers — always a DTO (`Java record` with `static from(Entity e)`)
3. **`@Transactional`** on all write service methods
4. **`@PreAuthorize`** on every write endpoint
5. **`ResourceNotFoundException`** (→ 404) for missing resources; `BusinessException` (→ 400) for business violations
6. New tables → `backend/src/main/resources/schema.sql`

### Frontend
1. **Ionic components only** — `IonButton`, `IonCard`, `IonList`, etc. Never Angular Material
2. **Standalone components** (`standalone: true`) — no NgModule
3. **Lazy loading** on ALL routes (`loadComponent`)
4. **Transloco mandatory** on all user-visible text — `{{ 'KEY' | transloco }}`
5. **`data-testid`** on all interactive elements (required for E2E tests)
6. Tests go in `frontend/src/test/` (mirror of `src/app/`) — never co-located

### Git / Workflow
1. Every task must be linked to a GitHub issue — see [Kanban](https://github.com/users/FunWarry/projects/3/views/1)
2. Branch naming: `<type>/#<N>-<description-kebab>` (e.g. `feat/#188-vue-client-qr`)
3. Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `ci:`
4. CI must be green + SonarCloud PASSED before merging
5. Use `merge commit` (never squash) so the release workflow counts commits correctly

---

## Knowledge Base

The `.agents/knowledge/` directory contains up-to-date project context:

| File | Contents |
|------|----------|
| [architecture.md](knowledge/architecture.md) | Full stack, data model, roles, WebSocket topics, known bugs |
| [features-state.md](knowledge/features-state.md) | Feature implementation table (Backend/Frontend/Tests), tech debt |
| [conventions.md](knowledge/conventions.md) | Code conventions, naming, test structure, workflow pipeline |
| [figma-design-system.md](knowledge/figma-design-system.md) | Figma fileKey, 8 pages, 60+ component IDs, color tokens |

**Read relevant knowledge files before generating code.** Do not assume the project state — it evolves rapidly.

---

## Skills Available

Skills in `.agents/skills/` define reusable workflows for this project:

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `openbar-check` | "check env" / start of session | Verify dev environment (17 checks) |
| `openbar-install` | "setup project" / after ❌ in check | Install/repair the full dev environment |
| `openbar-dev` | "add feature X" / "generate component" | Generate code following OpenBar conventions |
| `openbar-ticket` | "implement issue #N" / "treat ticket #N" | Full ticket pipeline (branch → impl → tests → PR → merge) |
| `openbar-ki-update` | "update KIs" / after PR merged | Sync knowledge base with project state |

---

## GitHub Project Board

| Element | ID |
|---------|-----|
| Project | `PVT_kwHOBOlRss4Bac05` |
| Status field | `PVTSSF_lAHOBOlRss4Bac05zhVUX3s` |

| Status | Option ID |
|--------|-----------|
| Backlog | `f75ad846` |
| In progress | `47fc9ee4` |
| In review | `df73e18b` |
| Done | `98236657` |

---

## Versioning (CD)

- Push to `dev` → automatic pre-release (e.g. `v1.3.0-beta.5`)
- Push to `master` → stable release (e.g. `v1.3.0`) + auto-bump `pom.xml`
- Workflow: `.github/workflows/release.yml`
