# OpenBar — CLAUDE.md

Application de gestion de bar en temps réel : prise de commandes (serveurs), préparation (barmans), supervision (managers/admin).

## Stack technique

### Code actuel

| Couche     | Techno                       | Version     |
|------------|------------------------------|-------------|
| Backend    | Spring Boot                  | **4.0.6**   |
| Runtime    | Java                         | 22 (épinglé — Lombok incompatible JDK 23+) |
| Doc API    | Springdoc OpenAPI (Swagger UI) | 2.8.9       |
| BDD        | PostgreSQL                   | —           |
| ORM        | JPA / Hibernate + Lombok     | 1.18.34     |
| Sécurité   | Spring Security + JWT custom | JJWT 0.12.6 |
| Temps réel | WebSocket STOMP              | via Spring  |
| PDF        | OpenPDF                      | 2.0.3       |
| Frontend   | Angular                      | 20          |
| UI         | Ionic                        | 8.8.11      |
| State      | NgRx (store + effects)       | 20          |
| HTTP       | RxJS / HttpClient            | 7.8         |

### Stack cible (décisions actées)

**Décision UI :** Angular Material abandonné → composants Ionic (mobile/tablet-first).
**Décision déploiement :** Capacitor abandonné → PWA hébergée sur le réseau local du bar.

#### Pourquoi PWA locale plutôt que Capacitor natif

L'app tourne sur le **réseau WiFi du bar** (serveur local — Raspberry Pi 5 ou mini-PC). La coupure internet n'a donc aucun impact. Pour les micro-coupures WiFi, un Service Worker Angular PWA cache l'app shell et rejoue les requêtes en attente. Aucun App Store requis — les tablettes/téléphones ajoutent l'icône via "Ajouter à l'écran d'accueil".

#### Architecture déploiement cible

```
[Tablette serveur] ──┐
[Tablette barman]  ──┤── WiFi bar ──── [Mini-PC / Raspberry Pi 5]
[PC manager]       ──┘                  ├── Spring Boot :8080
                                         ├── PostgreSQL :5432
                                         └── Nginx → Angular PWA :80
```

| Couche               | Techno cible                          |
|----------------------|---------------------------------------|
| UI composants        | Ionic 8+ (ou Tailwind CSS si redesign)|
| Offline/résilience   | Angular PWA (`@angular/service-worker`)|
| Build natif          | ~~Capacitor~~ — **abandonné**         |
| Canvas plan de salle | Konva.js                              |
| i18n                 | Transloco (`@jsverse/transloco`)      |
| Déploiement prod     | Nginx sur mini-PC local (réseau bar)  |

#### Service Worker — stratégies de cache

- **App shell** (JS/CSS/HTML) : cache-first → l'UI s'affiche même sans réseau
- **Requêtes API GET** : network-first avec fallback cache
- **Requêtes API POST/PUT** (commandes, statuts) : queue offline → rejoué à la reconnexion

`ng add @angular/pwa` génère le squelette ; affiner `ngsw-config.json` pour les routes API.

## Lancer le projet

### Base de données
```bash
# Via Docker (docker-compose.yml dans backend/src/main/resources/)
cd backend/src/main/resources && docker compose up -d
```

### Backend

⚠️ **Version Java exacte requise : JDK 22** (pas "22+"). Lombok `1.18.34` (épinglé dans `backend/pom.xml`) ne supporte pas les internes du compilateur des JDK plus récents (24, 25...) — avec un JDK trop récent, les annotations `@Data` ne génèrent silencieusement **aucun** getter/setter, ce qui provoque une cascade d'erreurs `cannot find symbol getXxx()/setXxx()` à la compilation (cf. [#141](https://github.com/FunWarry/Open-Bar/issues/141)).

Les distributions récentes (Fedora 44+...) ne proposent plus JDK 22 via leur gestionnaire de paquets système. Utiliser un gestionnaire de version Java :

```bash
# via SDKMAN (https://sdkman.io/) — un .sdkmanrc est fourni à la racine du repo
sdk env install   # installe et active automatiquement le JDK listé dans .sdkmanrc
```

⚠️ **Variable d'environnement `JWT_SECRET` requise** (≥ 32 caractères / 256 bits) — `application.yml` référence `${JWT_SECRET}` sans valeur par défaut. Sans elle, le backend refuse de démarrer avec un message d'erreur explicite (`JwtProperties.validate()`), plutôt que l'ancienne `WeakKeyException` cryptique de JJWT.

```bash
# backend/.env.example montre le format attendu — générer sa propre valeur, jamais un secret fixe
export JWT_SECRET=$(openssl rand -base64 32)
```

```bash
cd backend
mvn spring-boot:run
# API dispo sur http://localhost:8080
```

### Frontend
```bash
cd frontend
npm install
ng serve           # http://localhost:4200
ng serve --host 0.0.0.0  # accès réseau local
```

## Architecture backend

Pattern strict : **Controller → Service → Repository**

```
src/main/java/com/bar/gestioncocktail/
├── config/          # SecurityConfig, WebSocketConfig, JwtProperties
├── controller/      # REST endpoints
├── service/         # Logique métier
├── repository/      # Spring Data JPA
├── model/           # Entités JPA (@Data Lombok)
├── dto/             # LoginRequest/LoginResponse
└── security/        # JwtAuthenticationFilter, JwtAuthorizationFilter, JwtTokenProvider
```

## Modèle de données (schéma principal)

```
users ──< user_roles
users ──< tables (serveur_id)
tables ──< commandes ──< commande_items ──< cocktails
                                         └──< cocktail_variantes
cocktails ──< cocktail_ingredients ──< ingredients
tables ──< factures ──< facture_items
users ──< audit_logs
```

## Rôles utilisateurs

`UserRole` enum : **ADMIN**, **MANAGER**, **SERVEUR**, **BARMAN**

| Rôle | Nature | Permissions clés |
|------|--------|-----------------|
| `ADMIN` | Maintenance technique uniquement — pas un rôle métier bar | CRUD users, tout |
| `MANAGER` | Supervision bar (rôle métier principal) | Lire commandes/tables/factures, annuler commandes, toggler disponibilité cocktails |
| `SERVEUR` | Prise de commande, suivi tables | Créer/annuler commandes, définir priorité items |
| `BARMAN` | Préparation commandes, stocks, cocktails | Changer statut commandes, CRUD cocktails/ingrédients/stocks |

Guards : `AuthGuard` (toute route authentifiée), `RoleGuard` (paramétrable via `route.data.roles`), `AdminGuard` (ADMIN uniquement).
NgRx selectors : `selectIsAdmin`, `selectIsManager`, `selectIsBarman`.

## Cycle de vie d'une commande

```
EN_ATTENTE → EN_PREPARATION → PRET → LIVREE → REGLEE
                                            ↘ ANNULEE (depuis n'importe quel état)
```

Timestamps auto-remplis dans `CommandeService.changerStatut()` :
- `datePreparation` ← EN_PREPARATION
- `dateLivraison` ← PRET (⚠ bug : devrait être sur LIVREE)
- `dateReglement` ← REGLEE

## WebSocket (STOMP)

Topics disponibles :
- `/topic/commandes` — nouvelles commandes
- `/topic/commandes/{id}` — changement de statut
- `/topic/tables` — occupation/libération
- `/topic/stock/alerte` — stock faible

Service frontend : `websocket.service.ts`

## Conventions de code

### Backend
- Injection par **constructeur** (pas `@Autowired` sur champs)
- `@Data` Lombok sur toutes les entités
- `@PrePersist` / `@PreUpdate` pour les timestamps `createdAt` / `updatedAt`
- `@Transactional` sur toutes les méthodes write du service
- DTOs de sortie : Java records avec `static XxxDTO from(Entity e)` — jamais d'entité JPA en réponse directe
- Exceptions métier : `GlobalExceptionHandler` gère `ResourceNotFoundException` (404), `BusinessException` (400), validation (400)
- `@PreAuthorize("hasRole('...')")` sur chaque endpoint en écriture — routes non protégées limitées aux cas où l'info doit être lisible avant authentification (`/api/auth/**`, vérification username/email à l'inscription, `GET /api/settings` pour la personnalisation visible dès le login) ; toute route de ce type doit rester en lecture seule (GET) et ne jamais exposer de donnée sensible

### Frontend (Angular + Ionic — migration en cours)
- Architecture feature-based : `features/`, `core/`
- Lazy loading sur toutes les routes (`loadComponent`)
- State management NgRx uniquement pour l'auth (le reste en services directs)
- ~~Angular Material~~ → **Ionic** pour tous les composants UI (migration actée)
- i18n : Transloco (`@jsverse/transloco`) — voir section dédiée ci-dessous
- Error interceptor : `errorInterceptor` (`core/interceptors/`) — gère les erreurs HTTP globalement avec toast Ionic

### Tests — règle absolue
- **Chaque feature branch inclut ses tests dans le même PR** — on ne merge pas sans tests
- Backend : JUnit 5 + Mockito dans `src/test/java/.../service/` — un test par méthode métier, cas limites obligatoires
- Frontend : Karma + Jasmine dans **`src/test/`** (structure miroir de `src/app/`, comme Maven — **pas** de co-localisation Angular)
- `tsconfig.spec.json` : `"src/test/**/*.spec.ts"` — ✅ configuré (PR #103)

#### Structure tests frontend (décision actée)

```
frontend/src/test/                     ← tous les *.spec.ts ici
├── app.component.spec.ts
├── core/
│   ├── guards/                        # auth.guard, role.guard, admin.guard
│   ├── interceptors/                  # auth.interceptor, error.interceptor
│   ├── services/                      # cocktail, commande, ingredient, table, websocket…
│   └── store/                         # auth.effects, auth.reducer, auth.selectors
└── features/
    ├── auth/                          # login, register
    ├── cocktails/                     # cocktail-list, cocktail-form
    ├── commandes/                     # commande-list, commande-form, commande-detail
    ├── dashboard-barman/              # dashboard + commande-card
    ├── dashboard-manager/             # dashboard + stat-card
    ├── dashboard-serveur/             # dashboard + table-card
    ├── factures/                      # facture-list, facture-detail, facture-split + services/
    ├── ingredients/                   # ingredient-list, ingredient-form, ingredient-detail
    └── tables/                        # table-list, table-form, table-detail
```

`frontend/tsconfig.spec.json` doit inclure `"src/test/**/*.spec.ts"` (pas `src/**/*.spec.ts`).

#### Patron backend (existant à reproduire)

```java
@ExtendWith(MockitoExtension.class)
class XxxServiceTest {
    @Mock XxxRepository xxxRepository;
    @InjectMocks XxxService xxxService;

    @Test void methode_cas_comportementAttendu() {
        given(xxxRepository.findAll()).willReturn(List.of(...));
        assertThat(xxxService.getAll()).hasSize(1);
    }
}
```

#### Patron frontend (existant à reproduire)

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

#### Couverture de tests — ✅ ticket #47 résolu (PR #103)

Suite de tests de non-régression complète dans `frontend/src/test/` et `backend/src/test/`.

**Résumé** : 53 specs Angular + 12 tests Java — CI vert.

**Structure frontend** : `src/test/` (structure miroir de `src/app/`, comme Maven). `tsconfig.spec.json` pointe sur `src/test/**/*.spec.ts`.

**Tests existants** : tous les services, guards, interceptors, store, composants core et features.

## Internationalisation (i18n)

### Exigence
L'application est **multilingue**. Ajouter une langue = ajouter un fichier JSON de traduction. Aucune modification de code requise.

### Solution retenue : Transloco (`@jsverse/transloco`)

Choix retenu plutôt que ngx-translate pour :
- Lazy loading natif des traductions par feature (pas de bundle monolithique)
- Support de l'architecture feature-based d'OpenBar
- Meilleur support TypeScript et Angular 20+
- Fichiers de langue scopés par feature + fichiers globaux

### Structure des fichiers de traduction — ✅ ticket #168 résolu (PR #173)

- **Codebase backend & frontend** : 100% en anglais (commentaires, logs, exceptions métier `GlobalExceptionHandler` / `TableService`).
- **Service d'i18n** : `LanguageService` dans `core/services/language.service.ts` pour la bascule réactive (`fr` / `en`) et la persistance dans `localStorage`.
- **Fichiers de langue** : `src/assets/i18n/fr.json` et `src/assets/i18n/en.json` couvrant l'ensemble de l'UI.

Fichiers scopés par feature (chargés à la demande) :
```
frontend/src/assets/i18n/
├── fr/
│   ├── commandes.json
│   ├── cocktails.json
│   └── tables.json
└── en/
    ├── commandes.json
    ├── cocktails.json
    └── tables.json
```

### Conventions
- Toutes les chaînes visibles dans les templates utilisent le pipe `{{ 'CLE' | transloco }}` ou la directive `transloco="CLE"`
- Les clés sont en `SCREAMING_SNAKE_CASE` : `COMMANDE.STATUT.EN_ATTENTE`
- Langue par défaut : **français (`fr`)**
- Langues supportées à terme : français, anglais (extensible)
- Jamais de texte hardcodé en français dans les templates

### Usage dans les composants standalone

Pour les fichiers scopés par feature (ex : `fr/commandes.json`), déclarer le scope dans le composant :

```typescript
@Component({
  providers: [provideTranslocoScope('commandes')]
})
```

### Ajouter une nouvelle langue
1. Créer `frontend/src/assets/i18n/<code>.json` (ex : `es.json` pour l'espagnol)
2. Créer `frontend/src/assets/i18n/<code>/` avec les fichiers scopés si besoin
3. Ajouter `<code>` à `availableLangs` dans `provideTransloco()` dans `main.ts`
4. C'est tout — la langue est disponible une fois les assets copiés et le sélecteur UI implémenté.

## Points d'attention / dette technique

1. ~~Secret JWT hardcodé~~ — **résolu PR #149** : `JWT_SECRET` externalisé en variable d'environnement, documenté (`CLAUDE.md` + `backend/.env.example`), validation fail-fast au démarrage si absent/trop faible (`JwtProperties.validate()`)
2. ~~`allow-circular-references: true`~~ — **résolu** : audit configuration Spring Boot saine sans références circulaires
3. ~~Bug dateLivraison~~ — **résolu** : horodatage unifié et tests vérifiant `dateLivraison` sur statut `LIVREE` dans `CommandeService`
4. ~~Tests insuffisants~~ — **résolu PR #103** : 53 specs Angular dans `src/test/` + 12 tests Java
5. ~~Pas de DTOs de sortie~~ — **résolu PR #83** : Java records avec `from(entity)` sur tous les controllers
6. ~~Typo `BARMEN`~~ — **résolu PR #85** : enum renommé `BARMAN`, migration SQL documentée dans `schema.sql`
7. ~~Refresh token absent~~ — **résolu PR #100** : rotation + interceptor HTTP frontend
8. ~~Exceptions génériques (`RuntimeException`)~~ — **résolu** : refactoring intégral vers `BusinessException` (HTTP 400) dans `FactureService`, `PdfService` et `JwtTokenProvider`
9. ~~JJWT 0.11.5 obsolète~~ — **résolu** : migré vers 0.12.6 (API `parser()`, `parseSignedClaims()`, `SecretKey`)
10. ~~Angular 19 CVEs XSS/XSRF~~ — **résolu** : migré Angular 20 + NgRx 20 + Ionic 8.8.11
11. **13 CVEs restantes (devDeps)** : dans les outils de build (esbuild, babel, vite) — corrigibles via Angular 22
12. ~~Rapport LCOV frontend jamais généré, SonarCloud en échec systématique~~ — **résolu PR #145** : `angular.json` référence désormais `karmaConfig`, `frontend/karma.conf.js` reconstruit de façon autonome (frameworks, plugins, browsers, `coverageReporter` avec `lcovonly`)

## Features implémentées vs. manquantes

> Dernière mise à jour : 2 août 2026 — PR #224 (Alignement Tables UI + Audit Figma 18 tickets)

| Feature | Backend | Frontend | Tests |
|---------|---------|----------|-------|
| Auth JWT | ✅ | ✅ | ✅ |
| Configuration initiale (/setup admin) | ✅ | ✅ | ✅ |
| Bibliothèque composants UI Figma | — | ✅ | ✅ |
| Écrans Figma communs (Login, Register, Profile, 404, Loading) | — | ✅ | ✅ |
| Écrans Figma Vue Barman (kanban, badges status/role, action buttons) | — | ✅ | ✅ |
| Refresh token JWT | ✅ | ✅ | ✅ |
| Gestion users (admin) (#203/#204) | ✅ | ✅ | ✅ |
| Rôles ADMIN/MANAGER/SERVEUR/BARMAN | ✅ | ✅ | ✅ |
| DTOs de sortie (tous controllers) | ✅ | — | ✅ |
| GlobalExceptionHandler | ✅ | — | ✅ |
| Error interceptor frontend | — | ✅ | ✅ |
| Cocktails CRUD | ✅ | ✅ | ✅ |
| Saisonnalité cocktails | ✅ | ✅ | ✅ |
| Variantes, Ingrédients & Déduction auto des stocks (#185/#182) | ✅ | ✅ | ✅ |
| Ingrédients CRUD & Routage (/ingredients) (#219) | ✅ | ✅ | ✅ |
| Tables CRUD & Alignement Figma (#224) | ✅ | ✅ | ✅ |
| Transfert de commande entre tables (#205/#207) | ✅ | ✅ | ✅ |
| Commandes | ✅ | ✅ | ✅ |
| Passage commande publique QR Code (#184) | ✅ | ✅ | ✅ |
| Déstockage auto (EN_PREPARATION & Variantes) | ✅ | — | ✅ |
| Alertes stock WebSocket | ✅ | ✅ | ✅ |
| Notifications WS (toasts + panneau navbar) | ✅ | ✅ | ✅ |
| Service de Broadcast STOMP & Diffusion Temps Réel (#187) | ✅ | — | ✅ |
| Impression Ticket de Caisse 80mm & Facture PDF A4 (#180) | ✅ | ✅ | ✅ |
| Factures (liste + détail + règlement) | ✅ | ✅ | ✅ |
| Conformité Légale & Facturation (SIRET/TVA/RCS/SHA-256) (#129–#134) | ✅ | ✅ | ✅ |
| Fusion d'additions (#186) | ✅ | ✅ | ✅ |
| Export factures (PDF) | ✅ | ✅ | ✅ |
| Division d'addition (splitEgal/splitParSelection) | ✅ | ✅ | ✅ |
| Dashboard Manager / stats | ✅ | ✅ polling 30s | ✅ |
| Dashboard Barman | ✅ | ✅ kanban temps réel | ✅ |
| Vue Serveur (plan de salle + variantes modal #182) | ✅ | ✅ modal + nouvelle commande + kanban | ✅ |
| Plan de salle interactif & Direct Étages (#222/#223) | ✅ | ✅ | ✅ |
| Vue Client QR Code (Passage commande publique + suivi STOMP) (#184) | ✅ | ✅ | ✅ |
| Fuseau horaire paramétrable (Etablissement / TimeService) | ✅ | ✅ | ✅ |
| Journal d'audit système (/api/audit-logs) (#206) | ✅ | ✅ | ✅ |
| Layout Global — TopBar globale conforme Figma (#208) | — | ✅ | ✅ |
| Layout Global — NavBar / Sidebar 64-220px repliable Figma (#209) | — | ✅ | ✅ |
| Refactorisation Design System UI — Tokens Couleurs & Composants Atomiques Figma 0:1 (#210) | — | ✅ | ✅ |
| Harmonisation Vues Applicatives Figma (#211) | — | ✅ | ✅ |
| Personnalisation Interactive Thème & Palettes HSL (#217) | — | ✅ | ✅ |
| Vue Globale Stock Barman & Manager (#226) | ✅ | ✅ | ✅ |
| Écran Onboarding — Flow 1ère connexion par rôle (#229) | — | ✅ | ✅ |



## Ajouter une nouvelle feature (checklist)

### Backend
1. Modèle JPA dans `model/` avec `@Data`, `@PrePersist`, `@PreUpdate`
2. Ligne dans `schema.sql`
3. Repository dans `repository/` (extends `JpaRepository<Entity, Long>`)
4. Service dans `service/` avec `@Transactional` sur les writes
5. Controller dans `controller/` avec `@PreAuthorize` sur chaque endpoint
6. DTO de sortie (Java record avec `from(entity)`) dans `dto/`
7. Ajouter l'audit dans `AuditLogService` si nécessaire
8. **Tests unitaires** dans `src/test/java/.../service/` (JUnit 5 + Mockito)

### Frontend
1. Modèle TypeScript dans le dossier feature ou `core/models/`
2. Service HTTP dans le dossier feature
3. Composants (list / form / detail) sous `features/<nom>/`
4. Route lazy-loadée dans `app.routes.ts` avec `data: { roles: [...] }` si `RoleGuard`
5. Lien dans la navbar si pertinent
6. **Tests** `.spec.ts` pour les sélecteurs, guards et services concernés

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->