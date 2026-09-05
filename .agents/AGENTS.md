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
| Backend | Spring Boot | **4.1.1** | |
| Runtime | Java | **22 (pinned)** | ⚠️ Lombok 1.18.34 breaks on JDK 23+ — no getters/setters generated |
| Security | Spring Security + JWT | JJWT 0.13.0 | `JWT_SECRET` env var required (≥ 32 chars) |
| PDF | OpenPDF | 2.0.3 | |
| WebSocket | STOMP | via Spring | 4 active topics |
| Frontend | Angular | **20** | |
| UI | **Ionic** | **8.8.11** | Angular Material is ABANDONED — never use it |
| State | NgRx | 20 | Auth store only — business state = services + signals |
| i18n | Transloco | — | All text must use `{{ 'KEY' | transloco }}` — no hardcoded FR |
| Deployment | PWA + Service Worker | — | Capacitor is ABANDONED |

---

## Absolute Rules

### Documentation, Language & Code Quality
1. **English is MANDATORY everywhere in the codebase**:
   - ALL code documentation (JavaDoc, TSDoc, OpenAPI descriptions).
   - ALL code comments, function names, variable names, enums, DTOs, and exception messages.
   - ALL test descriptions, test method names, and test mock data across both backend and frontend.
2. **Documentation is MANDATORY for all new or modified code** (JavaDoc on backend, TSDoc on frontend, OpenAPI annotations on controllers).
3. **NEVER use `@SuppressWarnings` annotations to bypass quality/security issues** — always refactor and resolve underlying code issues directly.

### Backend
1. **Never `@Autowired` on a field** — always constructor injection
2. **Never return JPA entities** from controllers — always a DTO (`Java record` with `static from(Entity e)`)
3. **`@Transactional`** on all write service methods
4. **`@PreAuthorize`** on every write endpoint
5. **`ResourceNotFoundException`** (→ 404) for missing resources; `BusinessException` (→ 400) for business violations (all exception messages in English)
6. **JavaDoc MANDATORY (in English)** for all services, DTOs, controllers, security, and exception classes
7. **OpenAPI annotations MANDATORY (in English)** on all REST controllers (`@Tag`, `@Operation`, `@ApiResponse`)
8. New tables → `backend/src/main/resources/schema.sql`

### Frontend
1. **Ionic components only** — `IonButton`, `IonCard`, `IonList`, etc. Never Angular Material
2. **Standalone components** (`standalone: true`) — no NgModule
3. **Lazy loading** on ALL routes (`loadComponent`)
4. **100% Translatable UI (Transloco mandatory)** — ALL user-visible text (pages, forms, buttons, toasts, modals, alerts, badges, table headers, notifications) MUST use Transloco (`{{ 'KEY' | transloco }}` or `translocoService.translate('KEY')`). NEVER hardcode text directly in HTML templates or TypeScript strings.
5. **i18n Parity MANDATORY for every frontend change** — any text addition or modification MUST update **both** `fr.json` AND `en.json` in the **same commit** as the component. A missing key in `en.json` is treated as a regression.
6. **TSDoc MANDATORY (in English)** on all Angular services (`core/services/` + feature services), guards, interceptors, and NgRx store
7. **Adaptive Theme & No Hardcoded Colors** — The application uses an adaptive theme system (Light/Dark). NEVER hardcode hex (`#1a1a2e`), RGB (`rgb(...)`), or named colors in CSS/SCSS or TS templates. Always use CSS variables from `frontend/src/theme/variables.css` (`var(--background-bg-0)`, `var(--background-surface-1)`, `var(--background-surface-2)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--border-medium)`, `var(--primary)`, `var(--semantic-success)`, `var(--semantic-danger)`, `var(--semantic-warning)`, `var(--semantic-info)`, etc.).
8. **Onboarding & Configuration Update MANDATORY** — For every new feature or feature update, if applicable, systematically update the entire onboarding workflow (`/setup`, `OnboardingComponent`, `SetupComponent`, setup wizard) and configuration interfaces (`AppSettingsPageComponent`, establishment settings, seeders) to ensure the new capability is fully configurable and supported during initial establishment setup.

### Testing & Quality Assurance (Mandatory for ALL code written)
1. **Full Test Pyramid MANDATORY for every feature / change**:
   - **Unit Tests**: Every service, component, guard, interceptor, repository, and controller MUST have unit tests covering nominal, edge, and error branches.
   - **Non-Regression Tests**: Every bug fix, refactor, or optimization MUST include dedicated non-regression tests demonstrating the issue was fixed and guarding against regressions.
   - **Integration Tests (Backend)**: Critical workflows (order lifecycle, stock alerts, invoice settlement, auth/security) MUST have Spring Boot integration tests backed by Testcontainers (`backend/src/test/java/.../integration/`).
   - **End-to-End Tests (Frontend Playwright)**: ALL user-facing screens, navigation flows, and interactive components MUST include Playwright E2E tests (`frontend/e2e/`) validating browser interactions with `data-testid` selectors.
2. **`data-testid`** on all interactive elements in frontend templates.
3. Frontend tests go in `frontend/src/test/` (mirror of `src/app/`) — never co-located.
4. All test descriptions, test method names, assertions, and mock data MUST be in English.
5. **Platform Demo & Test Data Seeding MANDATORY** — In addition to automated tests, systematically add/update realistic demo and test data in `backend/src/main/resources/data/demo_dataset.json` and `SampleDataSeederService.java` (or dedicated seeder services) for every feature, so developers and QA can immediately test and interact with the feature on the live running platform in test/dev mode.

### Git / Workflow
1. Every task must be linked to a GitHub issue — see [Kanban](https://github.com/users/FunWarry/projects/3/views/1)
2. Branch naming: `<type>/#<N>-<description-kebab>` (e.g. `feat/#188-vue-client-qr`)
3. Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `ci:`
4. CI must be green + SonarCloud PASSED before merging
5. Use `merge commit` (never squash) so the release workflow counts commits correctly
6. **KI update MANDATORY after every merged PR** — run `openbar-ki-update` skill to sync `features-state.md` (and `architecture.md` if needed) with the real project state. Stale KIs cause regressions in future sessions.

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
| `openbar-post-merge` | "post-merge" / "after merge PR #X" | Post-merge cleanup, issue/board closure & KI sync |
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
