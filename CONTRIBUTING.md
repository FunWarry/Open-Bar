# OpenBar — Internal Developer & Contribution Guidelines

> **Notice**: OpenBar is a private, proprietary commercial software application owned by Mathéo Gevraise (FunWarry). This repository is strictly private. These guidelines are for authorized internal developers and team members.

---

## 1. Development Principles & Philosophy

OpenBar delivers mission-critical bar and POS operations through a dual-deployment model:
- **On-Premise (Self-Hosted)** on the bar's existing hardware (Bring Your Own Hardware - BYOH, e.g. mini-PC or Raspberry Pi 5).
- **French Cloud Sovereign Hosting** on dedicated/isolated cluster infrastructure (OVHcloud / Scaleway).

All code must adhere to the highest engineering standards: zero IDE problems, strict English documentation, full test pyramid, zero `@SuppressWarnings`, and strict Design System compliance.

---

## 2. Technology Stack & Prerequisites

| Component | Technology | Version | Notes |
|-----------|------------|---------|-------|
| Backend | Spring Boot | **4.2.0** | Java 22 (pinned — Lombok 1.18.34 incompatible with JDK 23+) |
| Frontend | Angular | **22.2.0** | Ionic 9.0.5 (Angular Material is strictly forbidden) |
| State | NgRx 22 / Signals | — | Auth store in NgRx; feature business state in Signals & Services |
| i18n | Transloco | **8.4.0** | Strict 100% translation parity in `fr.json` and `en.json` |
| Database | PostgreSQL | **15 / 16** | Relational ACID, dedicated database per tenant in cloud mode |
| Hardware Policy | Bring Your Own Hardware | — | We do NOT supply hardware; advisory guides provided only |

---

## 3. Development Workflow & Git Pipeline

1. **GitHub Issue Required**: Every feature, fix, or task must be linked to an issue on the [GitHub Project Board](https://github.com/users/FunWarry/projects/3/views/1).
2. **Dedicated Branch**:
   - `feat/#<issue-number>-<short-description-kebab>`
   - `fix/#<issue-number>-<short-description-kebab>`
   - `docs/#<issue-number>-<short-description-kebab>`
3. **Pipeline `openbar-ticket`**:
   Follow the 10-step pipeline integrating **Grill-Me** (interactive cadrage interview with user) and **Boost** (deep thinking, 5-perspective analysis, and rigorous verification).
4. **Conventional Commits**:
   - `feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`, `test: ...`, `ci: ...`

---

## 4. Mandatory Engineering Standards

### Documentation & Language
- **English is mandatory everywhere in the codebase**:
  - All JavaDoc, TSDoc, and OpenAPI descriptions (`@Tag`, `@Operation`, `@ApiResponse`).
  - All comments, variable names, method names, enums, DTOs, and exception messages.
  - All test names, assertions, and mock data.
- **Never use `@SuppressWarnings`** to silence security or quality warnings.

### Backend (Spring Boot)
- **Constructor Injection**: Never use `@Autowired` on fields.
- **DTOs Only**: Controllers must never expose JPA entities; always return Java records (`record XxxDto(...) with static from(Entity)`).
- **Transactional**: Use `@Transactional` on all write service methods.
- **Security**: Add `@PreAuthorize` on write and administrative endpoints.
- **Exceptions**: Throw `ResourceNotFoundException` (404) or `BusinessException` (400) with descriptive English messages.

### Frontend (Angular & Ionic)
- **Design System Components Only**: NEVER use raw HTML form controls (`<select>`, `<input type="checkbox">`, `<button>`). Systematically use `frontend/src/app/core/components/ui/` (`SearchableSelectComponent`, `CheckboxFieldComponent`, `ToggleSwitchComponent`, `ActionButtonComponent`, `InputFieldComponent`, `ModalComponent`).
- **Responsive 3 Tiers**: Systematically test Mobile (< 768px), Tablet (768-1024px), and Desktop (> 1024px).
- **Adaptive Theme**: Never hardcode colors. Always use CSS variables from `src/theme/variables.css`.
- **Transloco Parity**: Every text addition or change must update both `fr.json` and `en.json` in the same commit.

---

## 5. Pre-Push Validation & CI Quality Gate

Before pushing to GitHub, always execute the local validation suite:
```bash
node scripts/pre-push-check.js
```
The script validates:
- Transloco i18n parity (`fr.json` vs `en.json`)
- Zero `@SuppressWarnings`
- Zero hardcoded CSS colors
- Zero IDE problems / clean TypeScript (`npx tsc --noEmit`)
- Clean Java compilation (`mvn test-compile -q`)

CI must be 100% green with SonarCloud Quality Gate PASSED before any merge into `dev`.
