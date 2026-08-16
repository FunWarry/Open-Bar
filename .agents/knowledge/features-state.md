# OpenBar — État des Features & Roadmap

> Dernière mise à jour : 16 août 2026 — PR #301 / Issue #297 : Suppression de toutes les structures et données de test écrites en dur dans le code (Java et TypeScript) et centralisation 100% exclusive dans `backend/src/main/resources/data/demo_dataset.json` (étages, zones avec coordonnées/points de polygone/rayons, tables avec dimensions/formes/rotations/assignations, utilisateurs, 26 shifts de l'équipe avec pauses et heures prévues, fermetures d'établissement dominicales et annuelles récurrentes, commandes et factures). Seeders dynamiques `seedShiftsFromJson` et `seedClosuresFromJson` dans `SampleDataSeederService.java`, fallbacks propres dans `dashboard-serveur.service.ts` et `plan-salle.component.ts`, 100% tests au vert (1260 tests Karma frontend, 482 tests JUnit backend, SonarCloud Quality Gate PASSED avec 0 anomalie).

## Tableau des Features

| Feature | Backend | Frontend | Tests | Notes |
|---------|---------|----------|-------|-------|
| Documentation complète & API OpenAPI/Swagger (#192/#194) | ✅ | ✅ | ✅ | JavaDoc, TSDoc, OpenAPI 3.0 |
| Quality Gate SonarCloud & Sécurité 100% sans `@SuppressWarnings` | ✅ | ✅ | ✅ | Coverage > 80%, Note A |
| **Centralisation Jeu de Données Démo & Seeders Dynamiques (#297)** | ✅ | ✅ | ✅ | Centralisation 100% dans `demo_dataset.json` (étages, zones, tables, users, 26 shifts, closures, commandes, factures), `SampleDataSeederService.java` dynamique, 0 data hardcodée |
| **Encaissement & Paiement des Tables (#295)** | ✅ | ✅ | ✅ | `GET /api/factures/table/{id}/addition`, `POST /api/factures/table/{id}/encaisser`, `EncaissementModalComponent`, Split égal/sélection, calculateur monnaie, pourboires, remises, ticket 80mm, PDF A4, STOMP temps réel |
| Planning d'équipe & Gestion des Shifts (#275) | ✅ | ✅ | ✅ | Vue `/employees`, modal créneaux par personne, presets, fermetures, duplication drag & drop, WS `/topic/schedule-publications` |
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
| Section Préférences Profil & Toggles Notifications (#234) | — | ✅ | ✅ | Section PREFERENCES Figma 540:1022 (toggles son/visuel + sélecteur langue) |
| Refresh token JWT | ✅ | ✅ | ✅ | Rotation + interceptor |
| Gestion users (admin) | ✅ | ✅ | ✅ | Service UserService REST + UserListComponent CRUD & UserDialog modal refactoré (#204/#203) |
| Rôles ADMIN/MANAGER/SERVEUR/BARMAN | ✅ | ✅ | ✅ | — |
| DTOs de sortie (tous controllers) | ✅ | — | ✅ | Java records `from(entity)` |
| GlobalExceptionHandler | ✅ | — | ✅ | — |
| Error interceptor frontend | — | ✅ | ✅ | — |
| Filtre Allergènes cocktails (#244) | ✅ | ✅ | ✅ | Multi-sélection allergènes côté frontend, filtre combiné avec catégories |
| Bouton langue global (non connecté) (#245) | ✅ | ✅ | ✅ | Toggle FR/EN dans NavbarComponent + bouton flottant glassmorphique dans AppComponent |
| Cocktails CRUD | ✅ | ✅ | ✅ | — |
| Saisonnalité cocktails | ✅ | ✅ | ✅ | — |
| Variantes & Déduction auto stocks (#185/#182) | ✅ | ✅ | ✅ | Modal sélection & personnalisation |
| Ingrédients CRUD & Routage (/ingredients) (#219) | ✅ | ✅ | ✅ | Endpoint `GET /api/ingredients`, routes `/ingredients` (+ new/detail/edit), modal & select dark theme |
| Stock ingrédients PATCH (#249) | ✅ | ✅ | ✅ | CORS PATCH autorisé, endpoints `/{id}/stock` et `/{id}/seuil-alerte` acceptent PUT+PATCH + `@RequestParam` ou JSON `@RequestBody` |
| Tables CRUD | ✅ | ✅ | ✅ | — |
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
| Dashboard Manager (#293) | ✅ | ✅ live STOMP + analytics | ✅ | Cockpit manager complet, synchronisation WebSocket STOMP, 6 KPI cards (CA Jour/Mois, Commandes Actives, Panier Moyen, Occupation, Taux Service), Top Cocktails, flux de commandes, alertes stocks critiques, Kanban opérationnel enrichi avec filtres et alertes d'attente, export CSV, 1235 tests frontend + 469 backend 100% verts, SonarCloud 87.0% coverage |
| Dashboard Barman (#292) | ✅ | ✅ kanban temps réel | ✅ | Kanban temps réel STOMP, timers de préparation dynamiques avec alertes sonores et visuelles d'urgence, fiches recettes et dosages dépliables, modal de ruptures à chaud (cocktails/ingrédients), impression thermique 80mm, filtres et recherche multi-critères, thème adaptatif, 1224 tests frontend + 469 backend 100% verts, SonarCloud Note A (86.6% coverage, 0 bug) |
| Vue Serveur (plan de salle + variantes modal #182) | ✅ | ✅ modal + nouvelle commande + kanban + plan 2D | ✅ | Synchronisation complète du plan 2D avec /plan-salle (thème, formes, badge timer centré, sélection multi-zones, bascule fluide de vues, isolation gestes tactiles) |
| Plan de salle interactif Konva.js (#291) | ✅ | ✅ | ✅ | Canvas réactif Konva.js, échelle réelle 1px=1cm, modes magnétisme bord-à-bord & snap grille 50cm, protection mode non-édition, 0 lag, conforme Figma |
| Vue Client QR Code (passage commande + suivi STOMP) | ✅ | ✅ | ✅ | Vue Client mobile complète (`/client/commande`, `/client/suivi/:id`) |
| Fuseau horaire paramétrable (Etablissement / TimeService) | ✅ | ✅ | ✅ | TimeZone configurable par l'admin + fallback Système |
| Journal d'audit système (/api/audit-logs) (#206) | ✅ | ✅ | ✅ | Component & Service Admin |
| TopBar globale conforme Figma (#208) | — | ✅ | ✅ | NavbarComponent |
| NavBar / Sidebar 64-220px globale Figma (#209) | — | ✅ | ✅ | SidebarComponent |
| Refacto Design System & Composants Atomiques Figma (#210) | — | ✅ | ✅ | Atoms UI Figma |
| Harmonisation Vues Applicatives Figma (#211) | — | ✅ | ✅ | ProductCard, StatCard, etc. |
| **Audit log immutable EDT + Time-Travel Replay (#285)** | ✅ | ✅ | ✅ | Table `shift_audit_log`, `ShiftAuditService`, `ScheduleHistoryModalComponent`, `ShiftHistoryModalComponent`, replay EDT à un instant T, SonarCloud 81.3% |
| **Prise de commande serveur moderne (#290)** | ✅ | ✅ | ✅ | `NouvelleCommandeComponent`, recherche live, filtres catégories/allergènes, décomposition HT/TVA/TTC, 100% tests Karma (1195/1195), SonarCloud 100% coverage |

## Features Manquantes Prioritaires (Frontend & UI Figma)

*Toutes les vues applicatives, composants atomiques et le routage des ingrédients sont 100% implémentés et validés.*

## Dette Technique Active

| # | Description | Statut |
|---|-------------|--------|
| 1 | `allow-circular-references: true` Spring | ⚠️ À corriger |
| 2 | Bug `dateLivraison` set sur `PRET` au lieu de `LIVREE` | ⚠️ Bug connu |
| 3 | 13 CVEs devDeps Angular (esbuild, babel, vite) | ⚠️ Angular 22 requis |

## Historique Résolutions

| PR / Issue | Description |
|------------|-------------|
| #301 (#297) | Suppression de l'intégralité des données de démonstration / test hardcodées dans le code (Java et TypeScript) et centralisation 100% exclusive dans `backend/src/main/resources/data/demo_dataset.json` (étages, zones avec points de polygone/rayons, 25 tables avec dimensions/formes/rotations/positions/assignations, utilisateurs avec rôles, 26 shifts complets de l'équipe avec pauses et heures prévues, fermetures d'établissement dominicales et jours fériés, 16 commandes et 9 factures). Refactorisation de `SampleDataSeederService.java` avec seeders dynamiques `seedShiftsFromJson` et `seedClosuresFromJson` sans aucun résidu statique, nettoyage des fallbacks en dur dans `dashboard-serveur.service.ts` et `plan-salle.component.ts`, neutralisation du regroupement de zone dans `dashboard-serveur.component.ts`, 1260 tests frontend + 482 tests backend 100% verts, Quality Gate SonarCloud PASSED (82.9% new coverage, 0 bug, 0 warning, 0 hotspot). |
| #300 (#295) | Gestion complète de l'encaissement et du paiement des tables avec commandes livrées pour serveurs et managers : `GET /api/factures/table/{tableId}/addition` (calcul dynamique, détail des articles, TVA 20%, HT/TTC), `POST /api/factures/table/{tableId}/encaisser` (génération facture officielle `FAC-YYYY-NNNNN`, statut `REGLEE`, libération automatique de table, notifications STOMP `/topic/tables` et `/topic/commandes`, journalisation audit log), modal d'encaissement moderne adaptatif (`EncaissementModalComponent`), mode paiement unique avec calculateur de monnaie interactif et jetons rapides (+5€, +10€, +20€, +50€, montant exact), sélection des pourboires (+5%, +10%, libre), remises commerciales (% ou montant fixe), mode Split (partage égal avec gestion du nombre de convives et règlements unitaires via `ReglementModalComponent`, ou partage par attribution d'articles aux convives avec suivi réactif du solde), impression ticket thermique 80mm et téléchargement PDF A4, points d'accès intégrés dans `TableDetailModalComponent`, `KanbanServeurComponent` (bouton Encaisser dans LIVREE) et `DashboardServeurComponent`, traductions complètes FR/EN `ENCAISSEMENT.*` et `FACTURE.MODE_*`, 1257 tests frontend + 480 tests backend 100% verts, SonarCloud Quality Gate PASSED. |
| #298 (#292) | Refonte complète et modernisation du tableau de bord comptoir barman (`/barman`) : Kanban temps réel avec colonnes `EN_ATTENTE`, `EN_PREPARATION` et `PRET` synchronisées via STOMP WebSocket (`/topic/commandes`, `/topic/commandes/{id}`, `/topic/stock/alerte`), timers de préparation en direct avec shifting de couleur (Normal ➔ Warning ➔ Urgence pulsée `⚡ URGENT`) et alertes sonores Web Audio API, fiches recettes complètes avec dosages et instructions dépliables directement sur chaque ticket sans quitter le flux, modale de gestion des ruptures à chaud ("Quick Stock") pour désactiver un cocktail ou ajuster le stock d'un ingrédient en cours de service, impression des bons de préparation bar thermiques au format standard 80mm, filtres multi-critères et recherche live, conformité stricte au système de variables CSS adaptatives du thème, traductions complètes FR/EN `BARMAN_DASHBOARD.*`, 1224/1224 tests unitaires Karma 100% verts, SonarCloud Quality Gate PASSED (86.6% new coverage, 0 bug, 0 warning). |
| #297 (#291) | Alignement complet de la vue plan 2D serveur (`/serveur`) avec le plan de salle (`/plan-salle`) : synchronisation visuelle (formes rectangles, cercles, ovales, polygones, lueur et bordures néon selon statut/occupation), modes snap-to-grid (50cm) et magnétisme bord-à-bord des tables, positionnement du badge timer d'attente centré sous la capacité sans distorsion en rotation, filtre multi-zones par chips, protection du panneau latéral d'édition hors mode édition, correction de la réinitialisation du canevas Konva et du filtrage d'étages lors du changement de mode d'affichage, désactivation du pull-to-refresh mobile (`[disabled]="displayMode === 'PLAN'"`) et blocage des gestes de scroll natif sur le canvas (`touch-action: none !important`), 469 tests backend + 1212 tests frontend 100% verts, CI build production OK. |
| #294 (#290) | Refonte complète et modernisation de la prise de commande serveur (`/serveur/nouvelle-commande/:tableId`) : recherche textuelle en temps réel, puces de filtres par catégories de boissons (Cocktails, Softs, Bières, Vins, Snacks), sélecteur d'exclusion d'allergènes (Lactose, Gluten, Arachides...), panier réactif avec ajustement des quantités, décomposition comptable HT/TVA (20%)/Total TTC, 100% variables CSS adaptatives du thème, clés i18n FR/EN `SERVEUR.*` complétées, 1195/1195 tests Karma 100% verts, Quality Gate SonarCloud PASSED (100.0% new coverage, 0 bug). |
| #289 (#285) | Audit log immutable des modifications de créneaux EDT + vue historique à un instant T (time-travel replay) : table `shift_audit_log`, entités `ShiftAuditLog`/`ShiftAuditAction`, service `ShiftAuditService` (`logCreation`, `logUpdate`, `logDeletion`, `reconstructScheduleAt`, `getAuditLogForWeek`), endpoints `GET /api/shifts/{id}/history`, `GET /api/schedule/audit-log`, `GET /api/schedule/at`, modaux `ScheduleHistoryModalComponent` (filtre par action/employé, snapshot before/after, déclencheur replay) et `ShiftHistoryModalComponent` (historique créneau individuel), mode Time-Travel Replay dans `ScheduleComponent` (sélecteur datetime, diff live vs planning courant, bannière lecture seule), i18n FR/EN (`SHIFTS.AUDIT`, `SHIFTS.REPLAY`), 470 backend tests + 1190 frontend tests, SonarCloud Quality Gate PASSED (81.3% new coverage, 0 bug). |
| #287 (#276) | Fix bouton comparaison EDT & UX shifts : synchronisation `forkJoin` pour le chargement du planning et de la publication (élimine la disparition du bouton de comparaison au changement de semaine), clic sur cellule vide ouvre directement le formulaire de création pré-rempli (`initialDate`, `openInCreateMode`), en-tête employé converti en `<button>` sémantique pour ouvrir la liste des shifts d'une personne, et 100% tests Karma / SonarCloud Quality Gate PASSED. |
| #279 (#275) | Planning d'équipe & Gestion des Shifts par employé (Figma 540:1022) : Vue Employés Manager (`/employees`), modal de gestion des créneaux par personne (`EmployeeShiftModalComponent`), modal de fermeture d'établissement (`ClosureConfigModalComponent`), modal d'exceptions de fermeture par jour (`DayClosureModalComponent`), configuration des modèles de shifts (`ShiftPresetsConfigComponent`), duplication par glisser-déposer, raccourcis clavier (Ctrl+C, Ctrl+V, Del, Esc), publication d'emploi du temps avec notifications STOMP temps réel `/topic/schedule-publications`, et Quality Gate SonarCloud 80.8% OK. |
| #271 (#270) | Modal de détail de commande interactive et responsive (Figma 630:1540) : ouverture au clic sur la carte, breakdown des articles avec prix unitaires et sous-totaux par ligne, boutons d'action intégrés pour avancer le statut ou annuler avec confirmation AlertController, élimination de toutes les duplications et refactoring 100% en variables CSS adaptatives du thème. CI & 1059 tests Karma 100% verts. |
| #253 (#228) | Vue Règlement Individuel Post-Split (`FactureSplitComponent`, Figma `630:1264`) : carte de suivi réactif du solde restant dû (Total, Encaissé, Solde restant, barre de progression), boutons 'Régler cette part' avec `ReglementModalComponent`, badges de statut par convive ('RÉGLÉ' vs 'EN ATTENTE'), finalisation globale automatique de la facture et de la table dès que l'intégralité des parts est réglée, 98/98 tests Karma passing. |
| #252 (#235) | Modal de règlement et gestion des pourboires (`ReglementModalComponent`, Figma `628:1068`) : boutons de pourboire réactifs (+5%, +10%, libre), recalcul dynamique du total, calculateur de rendu de monnaie en espèces, support backend `pourboire` dans `reglerFacture`, i18n FR/EN, 95/95 tests Karma passing. |
| #251 (#239) | Fix pré-remplissage formulaire Profil depuis le store NgRx Auth : souscription réactive avec `takeUntil(destroy$)`, sauvegarde via `UserService.updateUser()`, dispatch `setCurrentUser`, notification Toast i18n, nettoyage des fuites mémoire et warnings Angular/TypeScript. |
| #250 (#249) | Fix CORS PATCH + support JSON body sur `PATCH /api/ingredients/{id}/stock` et `/{id}/seuil-alerte` : ajout de `"PATCH"` dans `SecurityConfig.java`, mappings `PUT+PATCH` dans `IngredientController`, correction syntaxe Transloco `{{param}}` dans `fr.json` / `en.json`, nettoyage des `ALTER TABLE` redondants dans `schema.sql`, +8 tests unitaires `IngredientControllerTest` (coverage Sonar PASSED). |
| #248 (#247) | Fix boucle setup au redémarrage : remplacement des `DROP TABLE IF EXISTS ... CASCADE` par `CREATE TABLE IF NOT EXISTS` dans `schema.sql` — préserve les données entre redémarrages. |
| #246 (#245) | Bouton de traduction global : ajout du toggle FR/EN dans `NavbarComponent` (connecté) et bouton flottant glassmorphique dans `AppComponent` (non connecté). |
|------------|-------------|
| #220 | Refactorisation et alignement Figma des fenêtres modales `UserDialogComponent` et `IngredientFormComponent` (composants atomiques `app-input-field`, puces interactives de rôles, suppression des doubles astérisques et emballages de cartes superflus, style dark theme pour les boîtes d'alerte et popovers `ion-select`). Correction de l'erreur HTTP 500 lors des requêtes `PUT /api/ingredients/{id}` et `PUT /api/users/{id}` (préservation des entités existantes et du champ `createdAt`). |
| #219 | Routage et intégration de la gestion des ingrédients (`/ingredients`, `/ingredients/new`, `/ingredients/:id`, `/ingredients/:id/edit`) avec `AuthGuard` et `RoleGuard(['ADMIN', 'MANAGER', 'BARMAN'])`. Endpoint `GET /api/ingredients` backend + `getAllIngredients()` service. Correction du warning `<ion-refresher> must be used inside ion-content` sur toutes les vues listes (`ingredient-list`, `cocktail-list`, `commande-list`, `table-list`). |
| #218 (#217) | Personnalisation Interactive du Thème et Générateur Automatique de Palettes HSL : création du Color Customization Studio Admin (`PersonnalisationComponent`), sélecteurs de couleurs interactifs pour les variables CSS globales (`--primary`, `--bg-0`, `--surface-1`) et les 4 rôles (`--role-admin`, `--role-manager`, `--role-serveur`, `--role-barman`), générateur HSL automatique dans `color-utils.ts`, 5 présélections de thèmes (Figma, Cyberpunk, Emerald, Sunset, Indigo), panneau d'aperçu dynamique réactif en direct, persistance `ThemeService` / `localStorage`, 18/18 tests Karma passing, Quality Gate SonarCloud PASSED |
| #216 (#211) | Alignement Interface Figma — Vues Applicatives et Composants Composites : création de `ProductCardComponent` (`app-product-card` Figma `129:95`), intégration des composants atomiques `app-filter-chip` et `app-product-card` dans la vue Client QR Code (`ClientCommandeComponent`), refactorisation de `StatCardComponent` (`199:189`) et `StockSeverityBadgeComponent` (`133:133`) avec TSDoc en anglais, attributs `data-testid` et syntaxe Angular `@if`, 24/24 tests unitaires Karma passing, Quality Gate SonarCloud PASSED |
| #215 (#210) | Refactorisation Design System UI & Composants Atomiques Figma (0:1) : Instanciation tokens CSS globaux (`--bg-0`, `--surface-1`, `--primary`, etc.), création et enrichissement des 9 composants atomiques UI réutilisables (ToggleSwitch, CheckboxField, Toast, Avatar, StatusBadge, RoleBadge, ActionButton, FilterChip, InputField) avec TSDoc en anglais, data-testid, 23/23 tests unitaires Jasmine/Karma, Quality Gate SonarCloud PASSED |
