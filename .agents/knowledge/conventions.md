# OpenBar — Code Conventions & Development Workflow

## Backend Conventions (Spring Boot)

### JPA Model
```java
@Data
@Entity
@Table(name = "my_table")
public class MyEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    // domain fields
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
```

### Absolute Backend Rules
- **Constructor injection** — never `@Autowired` on fields
- **`@Transactional`** on **all** write methods in services
- Output DTOs: **Java records** with `static XxxDTO from(Entity e)` — never return JPA entities directly in responses
- **`@PreAuthorize("hasRole('...')")`** on every write endpoint
- Exceptions: `ResourceNotFoundException` (404), `BusinessException` (400) → handled globally by `GlobalExceptionHandler`
- SQL Schema: all new tables must be added to `backend/src/main/resources/schema.sql`
- **Documentation**: JavaDoc and OpenAPI Swagger annotations must be written in English. No `@SuppressWarnings` allowed.

### Backend Tests (JUnit 5 + Mockito)
```java
@ExtendWith(MockitoExtension.class)
class XxxServiceTest {
    @Mock XxxRepository repo;
    @InjectMocks XxxService service;

    @Test void method_case_expectedBehavior() { ... }
}
```
- Location: `backend/src/test/java/.../service/`
- One test per business method — nominal cases + error cases + edge cases mandatory

---

## Frontend Conventions (Angular 20 + Ionic)

### Feature-based Structure
```
features/<name>/
├── <name>-list/     # List view (Ionic cards / list)
├── <name>-form/     # Creation/edition (reactive forms)
└── <name>-detail/   # Detail modal / view (optional)
```

### Absolute Frontend Rules
- **Standalone components** (`standalone: true`) — no NgModule
- **Lazy loading** on ALL routes (`loadComponent`)
- NgRx **only for Auth store** — all other domain state managed via services and Angular signals
- Never use unjustified `any` — type everything explicitly
- Never hardcode user-visible French strings in templates → always `{{ 'KEY' | transloco }}`
- **Adaptive Theme System & No Hardcoded Colors** — The application supports dynamic Light/Dark theme switching. NEVER hardcode hex (`#1a1a2e`), RGB, or named colors in CSS/SCSS/TS. Always use CSS variables from `frontend/src/theme/variables.css` (`var(--background-bg-0)`, `var(--background-surface-1)`, `var(--background-surface-2)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--border-medium)`, `var(--primary)`, `var(--semantic-success)`, `var(--semantic-danger)`, `var(--semantic-warning)`, `var(--semantic-info)`, etc.).
- **Documentation**: TSDoc comments on all services, guards, interceptors, and store files must be written in English.

### Internationalization (Transloco)
- Keys in `SCREAMING_SNAKE_CASE`: `COMMANDE.STATUT.EN_ATTENTE`
- Files: `src/assets/i18n/fr.json` and `en.json` + scoped feature files when needed
- 100% key parity required between `fr.json` and `en.json` in every commit modifying text

### Frontend Tests (Karma + Jasmine)
- Location: **`frontend/src/test/`** — mirror structure of `src/app/` (matching Maven structure)
- Never co-located next to component source files
- `tsconfig.spec.json`: `"src/test/**/*.spec.ts"`

```typescript
describe('XxxService', () => {
  let service: XxxService;
  let http: HttpTestingController;
  beforeEach(() => TestBed.configureTestingModule({
    imports: [HttpClientTestingModule],
    providers: [XxxService]
  }));
  it('getAll() calls GET /api/xxx', () => { ... });
});
```

---

## Git Workflow (Conventional Commits)

```
feat(#X): short description
fix(#X): short description
docs: description
chore: description
refactor(#X): description
test(#X): tests for ComponentName
```

### Branch Naming Convention
`<type>/#<number>-<kebab-case-description>`
Examples: `feat/#188-vue-client-qr`, `fix/#189-date-livraison`

---

## Ticket Pipeline (`openbar-ticket` — 10 Steps)

1. Read issue (`gh issue view <N>`) + move to "In progress" on GitHub Projects board
2. Create dedicated branch: `git checkout -b <type>/#N-<description>`
3. Implement feature/fix (atomic conventional commits, English docs, i18n parity)
4. Write comprehensive tests (nominal + error + edge cases)
5. Validate locally: `tsc --noEmit` + `ng test` + `mvn test` + `sonar-scan.ps1`
6. Push + create PR targeting `dev` branch + move board status to "In review"
7. Self-review / code-review checklist
8. Wait for 100% green CI + SonarCloud Quality Gate PASSED
9. Address review suggestions (e.g., automated Copilot reviewer)
10. Merge (merge commit, never squash) + delete branches + sync Knowledge Items (`openbar-ki-update`) + close issue (Done)

---

## GitHub Project Board Reference

| Field | ID |
|-------|----|
| Project | `PVT_kwHOBOlRss4Bac05` |
| Status field | `PVTSSF_lAHOBOlRss4Bac05zhVUX3s` |

| Status | Option ID |
|--------|-----------|
| Backlog | `f75ad846` |
| In progress | `47fc9ee4` |
| In review | `df73e18b` |
| Done | `98236657` |
