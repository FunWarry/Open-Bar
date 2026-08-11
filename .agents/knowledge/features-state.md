# OpenBar — État des Features & Roadmap

> Dernière mise à jour : 11 août 2026 — PR #289 (#285) : Audit log immutable des modifications EDT + vue historique EDT à un instant T (time-travel replay)

## Tableau des Features

| Feature | Backend | Frontend | Tests | Notes |
|---------|---------|----------|-------|-------|
| Documentation complète & API OpenAPI/Swagger (#192/#194) | ✅ | ✅ | ✅ | JavaDoc, TSDoc, OpenAPI 3.0 |
| Quality Gate SonarCloud & Sécurité 100% sans `@SuppressWarnings` | ✅ | ✅ | ✅ | Coverage > 80%, Note A |
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
| Dashboard Manager / stats | ✅ | ✅ polling 30s | ✅ | — |
| Dashboard Barman | ✅ | ✅ kanban temps réel | ✅ | — |
| Vue Serveur (plan de salle + variantes modal #182) | ✅ | ✅ | ✅ | — |
| Plan de salle interactif (Konva.js) | ✅ | ✅ | ✅ | CRUD complet des Zones avec catégories d'Étages (RDC, 1er Étage, Terrasse, etc.) |
| Vue Client QR Code (passage commande + suivi STOMP) | ✅ | ✅ | ✅ | Vue Client mobile complète (`/client/commande`, `/client/suivi/:id`) |
| Fuseau horaire paramétrable (Etablissement / TimeService) | ✅ | ✅ | ✅ | TimeZone configurable par l'admin + fallback Système |
| Journal d'audit système (/api/audit-logs) (#206) | ✅ | ✅ | ✅ | Component & Service Admin |
| TopBar globale conforme Figma (#208) | — | ✅ | ✅ | NavbarComponent |
| NavBar / Sidebar 64-220px globale Figma (#209) | — | ✅ | ✅ | SidebarComponent |
| Refacto Design System & Composants Atomiques Figma (#210) | — | ✅ | ✅ | Atoms UI Figma |
| Harmonisation Vues Applicatives Figma (#211) | — | ✅ | ✅ | ProductCard, StatCard, etc. |
| **Audit log immutable EDT + Time-Travel Replay (#285)** | ✅ | ✅ | ✅ | Table `shift_audit_log`, `ShiftAuditService`, `ScheduleHistoryModalComponent`, `ShiftHistoryModalComponent`, replay EDT à un instant T, SonarCloud 81.3% |

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
