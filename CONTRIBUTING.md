# Contributing to OpenBar

Thank you for your interest in contributing to **OpenBar**! We welcome community bug reports, documentation updates, translations, and feature pull requests.

Please take a few moments to read this document to understand our contribution process, code quality guidelines, and Contributor License Agreement (CLA).

---

## 1. Code of Conduct & Philosophy

OpenBar is built to provide high-performance, offline-first bar and POS management for local networks. We strive to maintain a respectful, welcoming, and productive community.

---

## 2. Contributor License Agreement (CLA) & Commercial Rights Grant

By submitting a Pull Request, patch, code snippet, or documentation to the OpenBar repository (hosted on GitHub or elsewhere), you agree to the following terms:

1. **Grant of Rights**: You grant to **Mathéo Gevraise (FunWarry)**, original creator and copyright holder of OpenBar, a perpetual, worldwide, irrevocable, royalty-free, non-exclusive, sublicensable, and transferable license to:
   - Use, reproduce, modify, display, perform, adapt, publish, distribute, and sublicense your contribution as part of the OpenBar project.
   - Incorporate your contribution into commercial editions, paid hardware appliances (e.g., Raspberry Pi POS hubs), proprietary modules, or paid enterprise distributions without monetary compensation or royalty obligations.
2. **Attribution & Moral Rights**: You retain authorship of your individual contributions. You will be credited in the Git commit history, release notes, and community contributor listings.
3. **Original Work Warranty**: You represent and warrant that your contributions are your original creation, that you have the legal authority to submit them, and that they do not infringe upon any third-party intellectual property or proprietary rights.

---

## 3. Development Environment & Stack

Before working on code, ensure your environment meets the project prerequisites:

| Component | Technology | Version | Notes |
|-----------|------------|---------|-------|
| Backend | Spring Boot | 4.1.1 | Java 22 (pinned — Lombok breaks on JDK 23+) |
| Frontend | Angular | 20 | Ionic 8.8.11 (no Angular Material) |
| State | NgRx 20 / Signals | — | Auth store in NgRx; feature state in Signals/Services |
| i18n | Transloco | — | 100% translation parity in `fr.json` and `en.json` |
| Database | PostgreSQL | 16+ | Local Docker container or Raspberry Pi |

---

## 4. Development Workflow

1. **GitHub Issue First**: Every pull request must be linked to an open GitHub issue.
2. **Branch Naming**:
   - `feat/#<issue-number>-<short-description-kebab>`
   - `fix/#<issue-number>-<short-description-kebab>`
   - `docs/#<issue-number>-<short-description-kebab>`
3. **Commit Convention**: We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`, `test: ...`, `ci: ...`

---

## 5. Mandatory Code Standards

### Documentation & Language
- **English is mandatory everywhere in the codebase**:
  - All JavaDoc, TSDoc, and OpenAPI descriptions (`@Tag`, `@Operation`, `@ApiResponse`).
  - All comments, variable names, method names, enums, DTOs, and exception messages.
  - All test method names, assertions, and mock datasets.
- **Never use `@SuppressWarnings`** to silence security or quality checks — always address the underlying issue.

### Backend (Spring Boot)
- **Constructor Injection**: Never use `@Autowired` on fields.
- **DTOs Only**: Controllers must never expose JPA entities; always return Java records (`record ProductDto(...)`).
- **Transactional**: Use `@Transactional` on all write service methods.
- **Security**: Add `@PreAuthorize` on write and administrative endpoints.
- **Exceptions**: Throw `ResourceNotFoundException` (404) or `BusinessException` (400) with descriptive English messages.

### Frontend (Angular & Ionic)
- **Ionic Only**: Use Ionic UI components (`IonButton`, `IonCard`, `IonModal`, etc.). Do not use Angular Material.
- **Standalone Components**: All components must use `standalone: true`.
- **Adaptive Theme**: Never hardcode hex (`#fff`), rgb, or color names. Always use CSS variables from `src/theme/variables.css` (`var(--background-bg-0)`, `var(--primary)`, `var(--text-primary)`).
- **Transloco Parity**: Every user-visible string must use Transloco. Whenever a key is added or modified, update **both** `src/assets/i18n/fr.json` and `src/assets/i18n/en.json` in the same commit.
- **`data-testid`**: Include `data-testid` attributes on all interactive elements for end-to-end automation.

---

## 6. Testing & Quality Gate

Every Pull Request must satisfy the test pyramid:
1. **Unit Tests**:
   - Backend: JUnit 5 & Mockito (`backend/src/test/`).
   - Frontend: Jasmine/Karma (`frontend/src/test/` — tests mirror `src/app/`, never co-located).
2. **Integration Tests**: Spring Boot `@SpringBootTest` with Testcontainers for PostgreSQL.
3. **End-to-End Tests**: Playwright tests in `frontend/e2e/`.
4. **Continuous Integration**: GitHub Actions checks (`build`, `test`, `e2e`) and SonarCloud analysis must pass cleanly before any merge.

---

## 7. Submitting a Pull Request

1. Push your branch to GitHub.
2. Open a Pull Request targeting the `dev` branch.
3. Reference the issue in the description (e.g., `Closes #418`).
4. Ensure CI tests pass and review feedback is addressed.
