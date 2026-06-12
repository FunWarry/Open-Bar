# OpenBar — CLAUDE.md

Application de gestion de bar en temps réel : prise de commandes (serveurs), préparation (barmans), supervision (managers/admin).

## Stack technique

### Code actuel

| Couche     | Techno                       | Version     |
|------------|------------------------------|-------------|
| Backend    | Spring Boot                  | 3.3.3       |
| Runtime    | Java                         | 22          |
| BDD        | PostgreSQL                   | —           |
| ORM        | JPA / Hibernate              | via Spring  |
| Sécurité   | Spring Security + JWT custom | JJWT 0.11.5 |
| Temps réel | WebSocket STOMP              | via Spring  |
| Frontend   | Angular                      | 19          |
| UI         | Ionic                        | 8+          |
| State      | NgRx (store + effects)       | 19          |
| HTTP       | RxJS / HttpClient            | 7.8         |

### Stack cible (décision actée)

Le frontend migre vers **Ionic + Angular + Capacitor** — Angular Material n'est pas adapté pour le mobile/tablet-first requis par une application de bar. La migration remplace les composants Angular Material par des composants Ionic.

| Couche               | Techno cible                  |
|----------------------|-------------------------------|
| UI mobile            | Ionic 8+                      |
| Build natif          | Capacitor 6+ (iOS + Android)  |
| Canvas plan de salle | Konva.js                      |
| i18n                 | ngx-translate ou Angular i18n |

## Lancer le projet

### Base de données
```bash
# Via Docker (docker-compose.yml dans backend/src/main/resources/)
cd backend/src/main/resources && docker compose up -d
```

### Backend
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

`UserRole` enum actuel : **ADMIN**, **SERVEUR**, **BARMEN** — ⚠️ `BARMEN` est une typo, et `MANAGER` est à ajouter.

| Rôle | Nature | À ajouter ? |
|------|--------|------------|
| `ADMIN` | Maintenance technique uniquement — pas un rôle métier bar | Non |
| `MANAGER` | Rôle métier principal (supervision, plan de salle, stats) | **Oui — à créer** |
| `SERVEUR` | Prise de commande, suivi tables | Non |
| `BARMEN` | Préparation commandes, stocks, cocktails | Non (typo à corriger) |

Accès frontend : guards `AuthGuard`, `RoleGuard`, `AdminGuard`

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
- Exceptions : `RuntimeException` avec message explicite (à migrer vers exceptions custom)
- Pas de DTO de sortie actuellement — les entités sont renvoyées directement (à améliorer)

### Frontend (Angular + Ionic — migration en cours)
- Architecture feature-based : `features/`, `core/`
- Lazy loading sur toutes les routes (`loadComponent`)
- State management NgRx uniquement pour l'auth (le reste en services directs)
- ~~Angular Material~~ → **Ionic** pour tous les composants UI (migration actée)
- i18n à intégrer dès le début

## Points d'attention / dette technique

1. **Secret JWT hardcodé** dans `application.yml` → à externaliser en variable d'environnement
2. **`allow-circular-references: true`** dans Spring → smell de design circulaire à corriger
3. **Bug dateLivraison** : set sur `PRET` au lieu de `LIVREE` dans `CommandeService.changerStatut()`
4. **Pas de tests** backend (ni unitaires, ni intégration) — priorité à adresser
5. **Pas de DTOs de sortie** — les entités JPA sont sérialisées directement (risque de boucles JSON et de fuite de données)
6. **Rôles** : l'enum `UserRole` a `BARMEN` (faute de frappe — devrait être `BARMAN` ou `BARTENDER`)

## Features implémentées vs. manquantes

| Feature | Backend | Frontend |
|---------|---------|----------|
| Auth JWT | ✅ | ✅ |
| Gestion users (admin) | ✅ | ✅ |
| Cocktails CRUD | ✅ | ✅ |
| Ingrédients CRUD | ✅ | ✅ |
| Tables | ✅ | ✅ |
| Commandes | ✅ | ✅ |
| Notifications WS | ✅ | ⚠️ partiel |
| Factures | ✅ | ❌ |
| Dashboard / stats | ❌ | ❌ |
| Déstockage auto à la commande | ❌ | — |
| Plan de salle interactif | ❌ | ❌ |
| Saisonnalité cocktails | ⚠️ modèle ok | ❌ |
| Division d'addition | ❌ | ❌ |
| Export factures (PDF) | ❌ | ❌ |

## Ajouter une nouvelle feature (checklist)

### Backend
1. Modèle JPA dans `model/` avec `@Data`, `@PrePersist`, `@PreUpdate`
2. Ligne dans `schema.sql`
3. Repository dans `repository/` (extends `JpaRepository<Entity, Long>`)
4. Service dans `service/` avec `@Transactional` sur les writes
5. Controller dans `controller/` avec les bonnes annotations `@RolesAllowed` ou vérification via `SecurityConfig`
6. Ajouter l'audit dans `AuditLogService` si nécessaire

### Frontend
1. Modèle TypeScript dans le dossier feature ou `core/models/`
2. Service HTTP dans le dossier feature
3. Composants (list / form / detail) sous `features/<nom>/`
4. Route lazy-loadée dans `app.routes.ts`
5. Lien dans la navbar si pertinent

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