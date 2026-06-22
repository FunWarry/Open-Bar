# Sprint 22 juin 2026 — Sécurité + Couverture de tests

## Contexte

Sprint de consolidation : fermeture des PRs en attente, correction des blocages CI/Sonar, et mise en place de la couverture de tests complète sur tout le projet.

---

## Ce qui a été fait

### PR #100 — Refresh token JWT (issue #40) ✅

**Problème** : la branche `feat/refresh-token-40` était bloquée par Sonar (Reliability B) et en retard sur `dev`.

**Actions** :
1. Rebase sur `dev` (4 commits obsolètes ignorés proprement)
2. `AuthController` : `RuntimeException` → `NoSuchElementException` (règle Sonar S112)
3. `refreshToken()` : `ResponseEntity<?>` → `ResponseEntity<TokenRefreshResponse>` typée (règle Sonar S1452), refactoring impératif lisible
4. CI repassé ✅ — mergé dans `dev`

**Ce que fait la feature** :
- Backend : entité `RefreshToken` (UUID, expiry 7j, `@OneToOne` user), `POST /api/auth/refresh` (rotation), `POST /api/auth/logout` (révocation DB)
- Frontend : `authInterceptor` réécrit — refresh silencieux sur 401 + concurrence gérée via `BehaviorSubject`

---

### Clôture issues #35 et #48

- **#35** (saisonnalité cocktails) — fermée manuellement, résolue par PR #102 déjà mergée sur `dev`
- **#48** (export PDF) — fermée manuellement, résolue par PR #101 déjà mergée sur `dev`

---

### PR #103 — Couverture de tests complète (issue #47) ✅

**Problème** : aucune structure de test cohérente, specs co-localisées (convention Angular), couverture quasi nulle.

**Décision architecturale** : migration vers `src/test/` (structure miroir Maven — voir CLAUDE.md), `tsconfig.spec.json` mis à jour.

**Ce qui a été livré** :

| Périmètre | Fichiers | Détail |
|-----------|----------|--------|
| tsconfig.spec.json | 1 | `src/test/**/*.spec.ts` au lieu de `src/**/*.spec.ts` |
| Specs migrés | 5 | app, role.guard, cocktail.service, auth.selectors, error-404 (imports recalculés) |
| Backend nouveaux | 6 | DashboardServiceTest, AuditLogServiceTest, PdfServiceTest, NotificationServiceTest, CocktailIngredientServiceTest, CocktailVarianteServiceTest |
| Backend étendu | 1 | FactureServiceTest + `splitEgal()` + `splitParSelection()` |
| Frontend core | 18 | 7 services, 2 guards, 2 interceptors, 2 store (effects + reducer), 5 composants |
| Frontend features | 29 | auth, cocktails, commandes, dashboards ×3, factures, ingrédients, tables, admin, home, profile |

**Bugs CI rencontrés et corrigés** :

| Erreur | Cause | Fix |
|--------|-------|-----|
| `thenAnswer()` / `thenReturn()` sur `BDDMyOngoingStubbing` | Méthodes Mockito standard au lieu de BDDMockito | → `willAnswer()` / `willReturn()` |
| `convertAndSend()` ambiguë | `any()` sans type → Java ne sait pas choisir entre `(String, Object)` et `(Object, MessagePostProcessor)` | → `any(Object.class)`, cast `(Object) payloadCaptor.capture()` |
| `UnnecessaryStubbing` (Mockito strict) | Stub `save()` dans `@BeforeEach` inutilisé par certains tests | → `@MockitoSettings(strictness = Strictness.LENIENT)` |

**Résultat final** : 3 rounds de CI, tout vert. PR #103 mergée dans `dev`.

---

## État du projet après ce sprint

### Issues GitHub

| # | Titre | État |
|---|-------|------|
| #35 | Saisonnalité cocktails (frontend) | ✅ Fermée |
| #40 | Refresh token JWT | ✅ Fermée |
| #47 | Tests unitaires et d'intégration | ✅ Fermée |
| #48 | Export factures en PDF | ✅ Fermée |

### Issues ouvertes (dev)

| # | Titre | Avancement |
|---|-------|------------|
| #46 | Division d'addition — frontend UI | Backend prêt (`splitEgal`, `splitParSelection`), UI à faire |

### Issues Figma (design) — 12 ouvertes

#55, #56, #65, #66, #67, #68, #69, #70, #71, #72, #73, #75

---

## Ce qui reste à faire (priorités)

### Court terme — features prêtes backend, manquantes frontend

1. **WebSocketService** — implémenter les abonnements STOMP (vide depuis le début)
2. **Dashboard frontend** — `DashboardService` backend prêt + tests, UI à créer
3. **Vue Serveur** — 4 écrans Figma prêts, backend prêt, zero code frontend
4. **Division d'addition — UI** — boutons + composant split dans `facture-detail` (#46)

### Moyen terme

5. Corriger bug `dateLivraison` (set sur PRET → LIVREE)
6. Externaliser secret JWT
7. i18n avec Transloco (câblage)
8. Capacitor iOS/Android

### Design Figma

- Dashboard Manager (aucun écran, à créer from scratch)
- Division d'addition — flow UX (#66)

---

## Décisions techniques actées dans ce sprint

- **Structure tests frontend** : `src/test/` avec structure miroir, `tsconfig.spec.json` pointant sur `src/test/**/*.spec.ts`. La co-localisation Angular est abandonnée pour ce projet.
- **Mockito BDD** : toujours `given().willReturn()` — jamais `given().thenReturn()` (méthode absente sur `BDDMyOngoingStubbing`).
- **Stub global en `@BeforeEach`** : ajouter `@MockitoSettings(strictness = Strictness.LENIENT)` si le stub n'est pas utilisé par tous les tests.
- **Ambiguïté `SimpMessagingTemplate.convertAndSend()`** : toujours préciser le type du deuxième argument — `any(Object.class)` ou cast `(Object)`.
