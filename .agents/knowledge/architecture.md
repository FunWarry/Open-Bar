# OpenBar — Architecture & Contexte Projet

## Identité du projet

**OpenBar** — Application de gestion de bar en temps réel. Digitalise le cycle : prise de commande → préparation → service → facturation.

- **Repo** : `FunWarry/Open-Bar` (GitHub)
- **GitHub Project** : `PVT_kwHOBOlRss4Bac05`
- **Figma** : `XSVwFk64kgtqgUN9n5qoMw`
- **Déploiement cible** : PWA locale sur mini-PC/Raspberry Pi 5, réseau WiFi bar

## Stack Technique (actuelle)

| Couche | Techno | Version |
|--------|--------|---------|
| Backend | Spring Boot | 4.0.6 |
| Runtime | Java | 22 (épinglé — pas 23+, Lombok incompatible) |
| BDD | PostgreSQL | — (Docker Compose) |
| ORM | JPA/Hibernate + Lombok `@Data` | via Spring |
| Sécurité | Spring Security + JWT custom | JJWT 0.12.6 |
| Temps réel | WebSocket STOMP | via Spring |
| Frontend | Angular | 20 |
| UI | Ionic | 8.8.11 |
| State | NgRx (store + effects) | 20 — **auth uniquement** |
| HTTP | RxJS / HttpClient | 7.8 |
| i18n | Transloco (`@jsverse/transloco`) | — |
| Canvas | Konva.js | — |
| PDF | OpenPDF | 2.0.3 |
| Tests backend | JUnit 5 + Mockito | — |
| Tests frontend | Karma + Jasmine | — |
| CI | GitHub Actions | 1 workflow (ci.yml) |
| Qualité | SonarCloud + Qodana | — |

## Architecture Backend

Pattern strict **Controller → Service → Repository** — aucun saut de couche.

```
src/main/java/com/bar/gestioncocktail/
├── config/     # SecurityConfig, WebSocketConfig, JwtProperties
├── controller/ # REST endpoints (@PreAuthorize obligatoire sur writes)
├── service/    # Logique métier (@Transactional sur writes)
├── repository/ # Spring Data JPA (extends JpaRepository<Entity, Long>)
├── model/      # Entités JPA (@Data Lombok, @PrePersist/@PreUpdate)
├── dto/        # Java records avec static XxxDTO from(Entity e)
└── security/   # JwtAuthenticationFilter, JwtAuthorizationFilter, JwtTokenProvider
```

**Secrets** : `JWT_SECRET` requis (≥ 256 bits) — externalité en `.env`, validé au démarrage (`JwtProperties.validate()`).

## Architecture Frontend

```
frontend/src/
├── app/
│   ├── app.routes.ts          # Toutes les routes lazy-loadées
│   ├── core/
│   │   ├── guards/            # AuthGuard, RoleGuard, AdminGuard
│   │   ├── interceptors/      # authInterceptor, errorInterceptor
│   │   ├── models/            # Interfaces TypeScript
│   │   ├── services/          # Services HTTP partagés
│   │   └── store/             # NgRx (auth uniquement : effects, reducer, selectors)
│   └── features/
│       ├── auth/
│       ├── cocktails/
│       ├── commandes/
│       ├── dashboard-barman/
│       ├── dashboard-manager/
│       ├── dashboard-serveur/
│       ├── factures/
│       ├── ingredients/
│       └── tables/
└── test/                      # Miroir de src/app/ — TOUS les *.spec.ts ici
    ├── core/
    └── features/
```

**Décisions architecturales actées :**
- Angular Material → **abandonné** → Ionic 8+
- Capacitor → **abandonné** → PWA (`@angular/pwa`, Service Worker)
- NgRx → **auth uniquement** — reste en services directs + signals
- Tests → **`src/test/`** (structure miroir Maven, PAS co-localisés)

## Modèle de Données

```
users ──< user_roles
users ──< tables (serveur_id)
tables ──< commandes ──< commande_items ──< cocktails
                                         └──< cocktail_variantes
cocktails ──< cocktail_ingredients ──< ingredients
tables ──< factures ──< facture_items
tables ──< table_sessions              ← QR code client (token temporaire)
etages                                 ← Niveaux du bar (RDC, ETAGE_1…) — seed @PostConstruct
zones ──< tables                       ← Polygones libres JSON plan de salle (étage FK via code)
users ──< audit_logs
app_settings                           ← Singleton personnalisation admin
```

## Rôles Utilisateurs

| Rôle | Nature | Permissions clés |
|------|--------|-----------------|
| `ADMIN` | Maintenance technique uniquement | CRUD users, tout accès |
| `MANAGER` | Supervision bar (rôle métier principal) | Stats, annulation commandes, toggle dispo cocktails |
| `SERVEUR` | Prise de commande | Créer/annuler commandes, suivi tables |
| `BARMAN` | Préparation + stocks | Changer statut commandes, CRUD cocktails/ingrédients |

**NgRx selectors** : `selectIsAdmin`, `selectIsManager`, `selectIsBarman`, `selectIsAuthenticated`, `selectCurrentUser`

## Cycle de Vie d'une Commande

```
EN_ATTENTE → EN_PREPARATION → PRET → LIVREE → REGLEE
                                            ↘ ANNULEE (tout état)
```

⚠️ **Bug connu** : `dateLivraison` set sur `PRET` au lieu de `LIVREE` dans `CommandeService.changerStatut()`.

## WebSocket STOMP — Topics

| Topic | Événement |
|-------|-----------|
| `/topic/commandes` | Nouvelle commande créée |
| `/topic/commandes/{id}` | Changement de statut |
| `/topic/tables` | Occupation / libération |
| `/topic/stock/alerte` | Stock faible |

## Lancer le Projet

```bash
# BDD
cd backend/src/main/resources && docker compose up -d

# Backend
export JWT_SECRET=$(openssl rand -base64 32)
cd backend && mvn spring-boot:run   # → http://localhost:8080

# Frontend
cd frontend && npm install && ng serve   # → http://localhost:4200
```

⚠️ **JDK 22 exact requis** (pas 23+) — Lombok `1.18.34` incompatible avec les internes du compilateur des JDK récents.

## CI/CD

- **ci.yml** : Build + tests backend (Java 22 + PostgreSQL service) + frontend (Node 22) + SonarCloud
- SonarCloud : analyse uniquement sur `master` (push) ou toute PR vers `dev`/`master`
- **Board statuts** : Backlog `f75ad846` → In progress `47fc9ee4` → In review `df73e18b` → Done `98236657`

## Points d'Attention Critiques

1. **`allow-circular-references: true`** dans Spring → smell à corriger
2. **Bug `dateLivraison`** set sur `PRET` au lieu de `LIVREE`
3. **13 CVEs restantes** (devDeps Angular : esbuild, babel, vite) — corrigibles via Angular 22
4. **Exceptions génériques** `RuntimeException` dans certains services → `NoSuchElementException` / exceptions métier
