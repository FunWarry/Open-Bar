# OpenBar — Conventions de Code & Workflow Dev

## Conventions Backend (Spring Boot)

### Modèle JPA
```java
@Data
@Entity
@Table(name = "ma_table")
public class MonEntite {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    // champs métier
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
```

### Règles absolues Backend
- Injection par **constructeur** — jamais `@Autowired` sur champ
- `@Transactional` sur **toutes** les méthodes write du service
- DTOs de sortie : **Java records** avec `static XxxDTO from(Entity e)` — jamais entité JPA en réponse
- `@PreAuthorize("hasRole('...')")` sur chaque endpoint en écriture
- Exceptions : `ResourceNotFoundException` (404), `BusinessException` (400) → gérées par `GlobalExceptionHandler`
- Schéma SQL : toute nouvelle table dans `backend/src/main/resources/schema.sql`

### Tests Backend (JUnit 5 + Mockito)
```java
@ExtendWith(MockitoExtension.class)
class XxxServiceTest {
    @Mock XxxRepository repo;
    @InjectMocks XxxService service;

    @Test void methode_cas_comportementAttendu() { ... }
}
```
- Localisation : `backend/src/test/java/.../service/`
- Un test par méthode métier — cas nominal + cas d'erreur + cas limites obligatoires

## Conventions Frontend (Angular 20 + Ionic)

### Structure par feature
```
features/<nom>/
├── <nom>-list/     # Liste (Material Table ou Ionic cards)
├── <nom>-form/     # Création/édition (reactive forms)
└── <nom>-detail/   # Vue détail (optionnel)
```

### Règles absolues Frontend
- Composants **standalone** (`standalone: true`)
- **Lazy loading** sur TOUTES les routes (`loadComponent`)
- NgRx **uniquement pour l'auth** — reste en services directs + signals
- Jamais `any` non justifié — typer explicitement
- Jamais de texte hardcodé en français dans les templates → `{{ 'CLE' | transloco }}`
- **Système de Thème Adaptatif & Pas de Couleurs Hardcodées** — L'application gère le basculement dynamique de thème (Light/Dark). Ne JAMAIS hardcoder de couleurs hex (`#1a1a2e`), RGB ou nommées dans les fichiers CSS/SCSS/TS. Toujours utiliser les variables CSS de `frontend/src/theme/variables.css` (`var(--background-bg-0)`, `var(--background-surface-1)`, `var(--background-surface-2)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--border-medium)`, `var(--primary)`, `var(--semantic-success)`, `var(--semantic-danger)`, `var(--semantic-warning)`, `var(--semantic-info)`, etc.).

### i18n (Transloco)
- Clés en `SCREAMING_SNAKE_CASE` : `COMMANDE.STATUT.EN_ATTENTE`
- Fichiers : `src/assets/i18n/fr.json` et `en.json` + scopés par feature (`fr/commandes.json`)
- Composants avec traductions scopées : `providers: [provideTranslocoScope('commandes')]`

### Tests Frontend (Karma + Jasmine)
- Localisation : **`frontend/src/test/`** — structure miroir de `src/app/` (comme Maven)
- Jamais co-localisés avec les composants
- `tsconfig.spec.json` : `"src/test/**/*.spec.ts"`

```typescript
describe('XxxService', () => {
  let service: XxxService;
  let http: HttpTestingController;
  beforeEach(() => TestBed.configureTestingModule({
    imports: [HttpClientTestingModule],
    providers: [XxxService]
  }));
  it('getAll() appelle GET /api/xxx', () => { ... });
});
```

## Workflow Git (Convention Commits)

```
feat(#X): description courte
fix(#X): description courte
docs: description
chore: description
refactor(#X): description
test(#X): tests NomComposant
```

### Nommage des branches
`<type>/#<numero>-<description-en-kebab-case>`
Exemples : `feat/#188-vue-client-qr`, `fix/#189-date-livraison`

## RTK — Économie de Tokens

**Toujours préfixer les commandes avec `rtk`** :

```bash
rtk git status / log / diff / add / commit / push / pull
rtk mvn test / verify
rtk npx ng test
rtk gh pr view / checks / issue list
rtk tsc / lint
```

## Pipeline openbar-ticket (10 étapes)

1. Lire le ticket (`gh issue view <N>`) + passer "In progress" sur le board
2. Créer branche dédiée : `git checkout -b feat/#N-description`
3. Implémenter (conventional commits atomiques)
4. Écrire les tests (même ticket — jamais séparé)
5. Valider en LOCAL : `tsc --noEmit` + `ng test` + `mvn test` + `sonar-scan.ps1`
6. Push + créer PR vers `dev`
7. Auto-critique `/code-review --effort <low|medium|high>`
8. Attendre CI 100% vert + SonarCloud PASSED
9. Traiter suggestions `copilot-pull-request-reviewer`
10. Merge (merge commit, jamais squash) + supprimer branches + mettre à jour `CLAUDE.md`

## IDs Board GitHub Project

| Champ | ID |
|-------|----|
| Project | `PVT_kwHOBOlRss4Bac05` |
| Status field | `PVTSSF_lAHOBOlRss4Bac05zhVUX3s` |

| Statut | Option ID |
|--------|-----------|
| Backlog | `f75ad846` |
| In progress | `47fc9ee4` |
| In review | `df73e18b` |
| Done | `98236657` |
