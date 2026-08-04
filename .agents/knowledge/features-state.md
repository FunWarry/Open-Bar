# OpenBar — État des Features & Roadmap

> Dernière mise à jour : 4 août 2026 — PR #248 : Préservation de la base de données au redémarrage et élimination des redirections /setup (#247)

## Tableau des Features

| Feature | Backend | Frontend | Tests | Notes |
|---------|---------|----------|-------|-------|
| Documentation complète & API OpenAPI/Swagger (#192/#194) | ✅ | ✅ | ✅ | JavaDoc, TSDoc, OpenAPI 3.0 |
| Quality Gate SonarCloud & Sécurité 100% sans `@SuppressWarnings` | ✅ | ✅ | ✅ | Coverage > 80%, Note A |
| Données légales établissement SIRET/TVA/RCS (#129/#134) | ✅ | ✅ | ✅ | Validation Luhn SIRET, format TVA FR, Formulaire Admin + Live preview ticket |
| Calcul TVA multi-taux (20%, 10%, 5.5%) (#130) | ✅ | ✅ | ✅ | Calcul HT/TVA/TTC par article, récapitulatif CA3 |
| Numérotation séquentielle factures (FAC-YYYY-NNNNN) (#131) | ✅ | ✅ | ✅ | Conformité CGI art. 289, émission Avoirs (AV-YYYY-NNNNN) |
| Archivage légal 10 ans & Intégrité SHA-256 (#132) | ✅ | ✅ | ✅ | Factures immuables finalisées + verification hash SHA256 PDF |
| Export comptable CSV & Déclaration TVA mensuelle (#133) | ✅ | ✅ | ✅ | Export UTF-8 BOM Excel, récapitulatif mensuel TVA |
| Impression Ticket 80mm & Facture PDF A4 (#180) | ✅ | ✅ | ✅ | Ticket thermique 80mm, en-tête légal, ventilation TVA, mentions de paiement |
| Auth JWT | ✅ | ✅ | ✅ | — |
| Configuration initiale (/setup admin) | ✅ | ✅ | ✅ | — |
| Bibliothèque composants UI Figma | — | ✅ | ✅ | — |
| Écrans communs (Login, Register, Profile, 404, Loading) | — | ✅ | ✅ | — |
| Écrans Vue Barman (kanban, badges, action buttons) | — | ✅ | ✅ | — |
| Refresh token JWT | ✅ | ✅ | ✅ | Rotation + interceptor |
| Gestion users (admin) | ✅ | ✅ | ✅ | Service UserService REST + UserListComponent CRUD complet (#204/#203) |
| Rôles ADMIN/MANAGER/SERVEUR/BARMAN | ✅ | ✅ | ✅ | — |
| DTOs de sortie (tous controllers) | ✅ | — | ✅ | Java records `from(entity)` |
| GlobalExceptionHandler | ✅ | — | ✅ | — |
| Error interceptor frontend | — | ✅ | ✅ | — |
| Cocktails CRUD | ✅ | ✅ | ✅ | — |
| Saisonnalité cocktails | ✅ | ✅ | ✅ | — |
| Variantes & Déduction auto stocks (#185/#182) | ✅ | ✅ | ✅ | Modal sélection & personnalisation |
| Filtrage cocktails par allergène (#243) | — | ✅ | ✅ | Détection auto d'allergènes, filtres par exclusion et badges visuels |
| Ingrédients CRUD & Routage (/ingredients) (#219) | ✅ | ✅ | ✅ | Endpoint `GET /api/ingredients`, routes `/ingredients` (+ new/detail/edit), guards & tests |
| Tables CRUD & Alignement Figma | ✅ | ✅ | ✅ | `TableListComponent` et `TableFormComponent` alignés Figma, chargement dynamique des zones via `ZoneService`, i18n FR/EN |
| Transfert commande entre tables (#186/#205) | ✅ | ✅ | ✅ | Bouton & TransfertModalComponent raccordés (#205/#207) |
| Commandes | ✅ | ✅ | ✅ | — |
| Passage commande publique QR (#184) | ✅ | ✅ | ✅ | — |
| Déstockage auto (EN_PREPARATION & Variantes) | ✅ | — | ✅ | — |
| Alertes stock WebSocket | ✅ | ✅ | ✅ | — |
| Notifications WS (toasts + panneau navbar) | ✅ | ✅ | ✅ | — |
| Service Broadcast STOMP (#187) | ✅ | — | ✅ | — |
| Notifications Sonores & Visuelles (#181) | ✅ | ✅ | ✅ | Synthétiseur Web Audio API & Badges |
| Configuration Seuils Alertes Commandes & Stock (#197) | ✅ | ✅ | ✅ | Réglages Manager et Barman |
| Factures (liste + détail + règlement) | ✅ | ✅ | ✅ | — |
| Fusion d'additions (#186) | ✅ | ✅ | ✅ | FusionModalComponent dans plan-salle |
| Export factures (PDF) | ✅ | ✅ | ✅ | OpenPDF A4 conforme mentions légales |
| Division d'addition (split égal/par sélection) | ✅ | ✅ | ✅ | — |
| Dashboard Manager / stats | ✅ | ✅ polling 30s | ✅ | — |
| Dashboard Barman | ✅ | ✅ kanban temps réel | ✅ | — |
| Vue Serveur (plan de salle + variantes modal #182) | ✅ | ✅ | ✅ | — |
| Plan de salle interactif (Konva.js) | ✅ | ✅ | ✅ | — |
| Vue Client QR Code (passage commande + suivi STOMP) | ✅ | ✅ | ✅ | Vue Client mobile complète (`/client/commande`, `/client/suivi/:id`) |
| Fuseau horaire paramétrable (Etablissement / TimeService) | ✅ | ✅ | ✅ | TimeZone configurable par l'admin + fallback Système |
| Journal d'audit système (/api/audit-logs) (#206) | ✅ | ✅ | ✅ | Component & Service Admin |
| Gestion directe des Étages (#222/#223) | ✅ | ✅ | ✅ | EtageEntity, EtageController, EtageService, ZoneManagerComponent onglet Étages |
| TopBar globale conforme Figma (#208) | — | ✅ | ✅ | NavbarComponent |
| NavBar / Sidebar 64-220px globale Figma (#209) | — | ✅ | ✅ | SidebarComponent |
| Refacto Design System & Composants Atomiques Figma (#210) | — | ✅ | ✅ | Atoms UI Figma |
| Harmonisation Vues Applicatives Figma (#211) | — | ✅ | ✅ | ProductCard, StatCard, etc. |
| Vue Globale Stock Barman & Manager (#226) | ✅ | ✅ | ✅ | Jauges visuelles, filtres recherche/catégorie, ajustement +/- et WebSocket |

## Roadmap des Tickets Restants (Audit Figma 8 pages)

### 🔴 Priorité HAUTE
- **Issue #225** (Ticket #A) : `feat: Vue Client — Écran Scanner QR Code [CLIENT]` (Figma 636:988)
- ~~**Issue #226** (Ticket #B) : `feat: Barman — Vue Globale Stock [BARMAN, MANAGER]` (Figma 488:3566)~~ ✅ (Mergé PR #240)
- **Issue #227** (Ticket #C) : `feat: Facturation — Vue Récap Journée [MANAGER]` (Figma 628:1096)
- **Issue #228** (Ticket #D) : `feat: Facturation — Vue Règlement Individuel Post-Split [MANAGER, SERVEUR]` (Figma 630:1264)
- **Issue #229** (Ticket #E) : `feat: Écran Onboarding — Flow 1ère connexion par rôle [TOUS]` (Figma 633:1100–1173)
- **Issue #230** (Ticket #F) : `feat: Composant EmptyState réutilisable [DS]` (Figma 540:1056)

### 🟡 Priorité MOYENNE
- **Issue #231** (Ticket #G) : `feat: Vue Barman — Ingrédients en mode Grille de Cartes [BARMAN]` (Figma 488:3524)
- **Issue #232** (Ticket #H) : `feat: Manager — Gestion Employés — Pagination et champs Shifts [MANAGER]` (Figma 492:1514)
- **Issue #233** (Ticket #I) : `feat: Manager — EDT Planning hebdomadaire complet [MANAGER]` (Figma 492:1556)
- **Issue #234** (Ticket #J) : `feat: Profil — Section Préférences et toggle notifications [TOUS]` (Figma 540:946)
- **Issue #235** (Ticket #K) : `feat: Facturation — Modal Règlement — Champ Pourboire [MANAGER, SERVEUR]` (Figma 628:1068)
- **Issue #236** (Ticket #L) : `feat: Vue Serveur Mobile — Bottom Navigation & MobileTableCard [SERVEUR]` (Figma 632:2240)

### 🟢 Priorité BASSE
- **Ticket #M** : `fix: Bug dateLivraison set sur PRET au lieu de LIVREE [BACKEND]` — ✅ Résolu (#224)
- **Ticket #N** : `refactor: Supprimer allow-circular-references [BACKEND]` — ✅ Résolu (#224)
- **Ticket #O** : `fix: Exceptions génériques RuntimeException → exceptions métier [BACKEND]` — ✅ Résolu (#224)
- **Issue #237** (Ticket #P) : `feat: Facturation — Format ticket 58mm [FACTURATION]` (Figma 640:1220)
- **Issue #238** (Ticket #Q) : `fix: Barman — Panel Stock — Alignement Figma complet [BARMAN]` (Figma 488:3340)
- **Issue #239** (Ticket #R) : `fix: Profil — Données formulaire non pré-remplies depuis le store NgRx [AUTH]`

## Dette Technique Active

| # | Description | Statut |
|---|-------------|--------|
| 1 | `allow-circular-references: true` Spring | ✅ Résolu (Audit configuration saine) |
| 2 | Bug `dateLivraison` set sur `PRET` au lieu de `LIVREE` | ✅ Résolu (Vérification & tests unifiés) |
| 3 | Exceptions génériques RuntimeException → BusinessException | ✅ Résolu (FactureService, PdfService, JwtTokenProvider) |
| 4 | 13 CVEs devDeps Angular (esbuild, babel, vite) | ⚠️ Angular 22 requis |

## Historique Résolutions

| PR / Issue | Description |
|------------|-------------|
| #248 (#247) | Conservation de la BDD au redémarrage & élimination de la redirection /setup : Suppression de la clause destructive `DROP TABLE IF EXISTS ... CASCADE` dans `schema.sql` et passage à `CREATE TABLE IF NOT EXISTS`. Les comptes utilisateurs, identifiants Admin et données de l'application sont désormais conservés intacts après chaque redémarrage du backend. Tests Java Spring Boot (358/358 OK). |
| #246 (#245) | Bouton de Traduction Global (Connecté & Non Connecté) : Intégration du bouton de bascule de langue (FR/EN) avec icône globe dans la TopBar (`NavbarComponent`) pour les utilisateurs connectés, et bouton flottant fixe sur toutes les vues non connectées (`/login`, `/register`, `/setup`, `/client/*`). Bascule instantanée du langage Transloco et sauvegarde `localStorage`. Tests unitaires Angular Karma (976/976 OK). |
| #244 (#243) | Filtrage des Cocktails par Allergène : Détection automatique des allergènes (Lait/Lactose, Gluten, Œufs, Fruits à coque, Arachides, Sulfites, Soja) sur les cocktails à partir des ingrédients, descriptions et instructions. Barre de filtres par exclusion interactive (chips/pills "Sans Lait", "Sans Gluten"...), bouton de réinitialisation rapide, et badges visuels d'avertissement ⚠️ sur les cartes (mode grille) et la vue liste. Support i18n FR/EN complet (`COCKTAILS.ALLERGENS.*`) et couverture de tests unitaires Jasmine/Karma (976/976 OK). |
| Refacto Tech | Résolution intégrale de la dette technique backend : Ticket #M (nommage & tests dateLivraison sur LIVREE), Ticket #N (audit circular references Spring saine), Ticket #O (refactoring des exceptions génériques vers BusinessException 400 dans FactureService, PdfService, JwtTokenProvider). |
| #242 | Vue Grille Cocktails Figma & Auto-création BDD Multi-Environnements : Intégration de la vue grille cocktails Figma avec cartes responsives, badges de statut, types de verres avec icônes 3D (`verre_martini`, `verre_old_fashioned`, `verre_tumbler`, etc.), et bouton de téléversement/prise de photo directe depuis l'appareil du barman/manager (`POST /api/cocktails/{id}/image`). Configuration multi-environnement PostgreSQL (dev, test, prod) avec auto-création dynamique de la BDD cible (`DatabaseAutoCreationConfig.java`) et initialiseur DDL sans crash. Traductions FR/EN et couverture de tests unitaires 100% verts (963 specs Angular + 358 tests Java OK). |
| #227 | Facturation — Vue Récap Journée [MANAGER] (Figma 628:1096) : Endpoint backend `GET /api/factures/daily-recap` (CA TTC, CA HT, TVA globale, panier moyen, nombre factures réglées, total clients) + `GET /api/factures/daily-recap/pdf` (génération PDF Z-Report A4 légal). Frontend Ionic 8 `/factures/recap` avec sélecteur de date, cartes KPIs réactives, tableaux de ventilation par mode de règlement et par taux de TVA (5.5%, 10%, 20%), export PDF en 1 clic. Tests unitaires Java JUnit 5 & Angular Karma (963/963 OK). |
| #226 | Vue Globale des Stocks Barman (Figma 628:1372) : Ingestion WebSocket STOMP `/topic/stock/alerte`, jauges visuelles de niveau de stock, badges colorés d'alerte (`danger`, `warning`, `success`), sélecteur de filtres de catégorie (Spirits, Softs, Syrups, Fruits, Other), commutateur de vue Liste/Grille, boutons d'ajustement rapide du stock (+/-) appelant `IngredientService.updateStock(id, qty)`. Tests Jasmine/Karma 100% verts (956/956 OK). |
| #224 | Alignement Figma TableListComponent & TableFormComponent : Sélecteur dynamique de zones branché sur `ZoneService`, i18n FR/EN complet (`ZONE_REQUIRED`, `SELECT_ZONE`, etc.), cartes de tables restylisées Dark Theme (wrapper-card, table-card), boutons d'action avec data-testid (`table-view-btn`, `table-edit-btn`). Audit complet des 8 pages Figma et établissement de la feuille de route des 18 tickets restants. |
| #223 (#222) | Gestion directe des Étages : nouveau modèle `EtageEntity` (table `etages`), `EtageController` CRUD REST (`GET/POST/PUT /api/etages`, `DELETE /api/etages/{id}`), `EtageService` avec seed `@PostConstruct` (5 étages par défaut), validation code unique, cascade code vers zones associées. Frontend : `etage.service.ts`, onglet Étages dans `ZoneManagerComponent` (création/édition/suppression), i18n fr/en. Tests : `EtageServiceTest` (12 cas), `EtageControllerTest` (5 cas), `etage.service.spec.ts`, `zone-manager.component.spec.ts` (16 cas). SonarCloud couverture > 80%. |
| #219 | Routage et intégration de la gestion des ingrédients (`/ingredients`, `/ingredients/new`, `/ingredients/:id`, `/ingredients/:id/edit`) avec `AuthGuard` et `RoleGuard(['ADMIN', 'MANAGER', 'BARMAN'])`. Endpoint `GET /api/ingredients` backend + `getAllIngredients()` service. Correction du warning `<ion-refresher> must be used inside ion-content` sur toutes les vues listes (`ingredient-list`, `cocktail-list`, `commande-list`, `table-list`). |
| #204 (#203) | Service UserService & Raccordement CRUD Utilisateurs Admin : Service REST `/api/users`, UserListComponent (liste, création, modification, suppression), spinners, toasts i18n, attributs data-testid et tests unitaires Jasmine/Karma (858/858 OK) |
| #203 | Resolution 403 / CSRF SPA Angular & Sonar Security Compliance : PassthroughCsrfTokenRepository pour API REST JWT stateless (0 avertissement Sonar java:S4502 / java:S3330), enregistrement global Ionicons, SVG favicon et i18n ERRORS.FORBIDDEN |
| #202 (#120/#200) | Vue Client QR Code (#120) & Refactoring UI complet Figma (#200) : Setup, Auth, Profile, Error 404, Dashboard Barman et Vue Client QR Code (passage commande public + suivi STOMP temps réel) |
| #201 (#200) | Refactor UI complet Figma : tokens CSS (variables.css / styles.css), ActionButton (variantes edit/mark), UserAvatar (role color), Navbar/Header/CocktailList migration @if/@for et a11y keyboard listeners |
| #199 (#180) | Impression Ticket de caisse 80mm & Rendu PDF A4 : TicketReceiptComponent thermique avec `@media print`, en-tête légal (SIRET, RCS, N° TVA, capital), ventilation TVA multi-taux et mentions légales de paiement |
| #198 (#129-#134) | Facturation Légale NF525 / CGI Art. 289 : Données établissement (SIRET/TVA/RCS), TVA multi-taux (20%/10%/5.5%), numérotation séquentielle, avoirs, archivage 10 ans SHA-256, export CSV & déclaration mensuelle CA3 + composant Admin Établissement |
| #197 | Configuration des Seuils d'Alerte Temporels des Commandes & Stock Ingrédients (Manager & Barman) |
| Fix IDE | Nettoyage des avertissements linter IDE (AppSettings @Column/ZoneId, ingredient-list Transloco & @if/@for control flow) |
| #196 (#181) | Notifications Sonores et Visuelles Temps Réel — Alertes Barman et Serveur |
| #195 (#182) | Variantes & Options de Personnalisation de Cocktails dans la Prise de Commande Serveur |
| #83 | DTOs de sortie Java records |
| #85 | Typo BARMEN → BARMAN |
| #100 | Refresh token + rotation |
| #103 | 53 specs Angular + 12 tests Java |
| #145 | LCOV frontend + SonarCloud fix |
| #149 | JWT_SECRET externalisé + validation fail-fast |
| #173 | i18n Transloco (fr/en) |
| #184 | QR Code commande publique (backend) |
| #185 | Variantes & Déduction auto stocks |
| #186 | Transfert table & Fusion factures |
| #187 | Service Broadcast STOMP |
| #194 | Documentation OpenAPI/Swagger, JavaDoc, TSDoc & SonarCloud Quality Gate (Security Rating A, Coverage >80%, 0 @SuppressWarnings) |
