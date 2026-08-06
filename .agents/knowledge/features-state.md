# OpenBar — État des Features & Roadmap

> Dernière mise à jour : 6 août 2026 — PR #258 : Vue Serveur Mobile — Bottom Navigation & MobileTableCard (#236)

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
| Vue Grille Cocktails & Verres 3D (#242) | ✅ | ✅ | ✅ | Cartes responsives, photos cocktails, verres 3D & auto-création BDD PostgreSQL |
| Filtrage cocktails par allergène (#243) | — | ✅ | ✅ | Détection auto d'allergènes, filtres par exclusion et badges visuels |
| Ingrédients CRUD & Routage (/ingredients) (#219) | ✅ | ✅ | ✅ | Endpoint `GET /api/ingredients`, routes `/ingredients` (+ new/detail/edit), guards & tests |
| Vue Barman Ingrédients Mode Grille (#231) | — | ✅ | ✅ | Affichage en cartes responsives des stocks d'ingrédients barman |
| Barman Stock Side Panel Alignement Figma (#238) | — | ✅ | ✅ | Ajustement visuel complet du panneau de stock barman |
| Tables CRUD & Alignement Figma | ✅ | ✅ | ✅ | `TableListComponent` et `TableFormComponent` alignés Figma, chargement dynamique des zones via `ZoneService`, i18n FR/EN |
| Transfert commande entre tables (#186/#205) | ✅ | ✅ | ✅ | Bouton & TransfertModalComponent raccordés (#205/#207) |
| Commandes | ✅ | ✅ | ✅ | — |
| Passage commande publique QR (#184) | ✅ | ✅ | ✅ | — |
| Écran Scanner QR Code Client (Figma 636:988) (#225) | — | ✅ | ✅ | Viseur vidéo live native BarcodeDetector, saisie manuelle & redirection commande |
| Déstockage auto (EN_PREPARATION & Variantes) | ✅ | — | ✅ | — |
| Alertes stock WebSocket | ✅ | ✅ | ✅ | — |
| Notifications WS (toasts + panneau navbar) | ✅ | ✅ | ✅ | — |
| Service Broadcast STOMP (#187) | ✅ | — | ✅ | — |
| Notifications Sonores & Visuelles (#181) | ✅ | ✅ | ✅ | Synthétiseur Web Audio API & Badges |
| Configuration Seuils Alertes Commandes & Stock (#197) | ✅ | ✅ | ✅ | Réglages Manager et Barman |
| Factures (liste + détail + règlement) | ✅ | ✅ | ✅ | — |
| Facturation Vue Récap Journée & Z-Report (#227) | ✅ | ✅ | ✅ | Endpoint daily-recap, ventilation TVA/règlements et export PDF A4 |
| Facturation Vue Règlement Post-Split (#228) | ✅ | ✅ | ✅ | Flow de paiement individuel séparé convives après division |
| Facturation Champ Pourboire (#235) | ✅ | ✅ | ✅ | Modal règlement avec saisie et comptabilisation du pourboire |
| Fusion d'additions (#186) | ✅ | ✅ | ✅ | FusionModalComponent dans plan-salle |
| Export factures (PDF) | ✅ | ✅ | ✅ | OpenPDF A4 conforme mentions légales |
| Division d'addition (split égal/par sélection) | ✅ | ✅ | ✅ | — |
| Dashboard Manager / stats | ✅ | ✅ polling 30s | ✅ | — |
| Manager Shifts Employés & Pagination (#232) | ✅ | ✅ | ✅ | Gestion des horaires/shifts du personnel et pagination |
| Manager Planning Hebdomadaire (#233) | ✅ | ✅ | ✅ | Planning emploi du temps interactif par employé |
| Dashboard Barman | ✅ | ✅ kanban temps réel | ✅ | — |
| Vue Serveur (plan de salle + variantes modal #182) | ✅ | ✅ | ✅ | — |
| Vue Serveur Mobile Bottom Navigation & MobileTableCard (#236) | — | ✅ | ✅ | Navigation basse mobile Ionic (< 768px), cartes compactes MobileTableCard & chronomètre d'attente |
| Plan de salle interactif (Konva.js) | ✅ | ✅ | ✅ | — |
| Vue Client QR Code (passage commande + suivi STOMP) | ✅ | ✅ | ✅ | Vue Client mobile complète (`/client/commande`, `/client/suivi/:id`) |
| Écran Onboarding Flow par Rôle (Figma 633:1100–1173) (#229) | — | ✅ | ✅ | Tutoriel interactif guidé 5 rôles + relance Profil & i18n |
| Composant EmptyState Réutilisable (Figma 540:1056) (#230) | — | ✅ | ✅ | Composant UI atomique avec illustration & action |
| Profil Section Préférences & Notifications (#234) | — | ✅ | ✅ | Toggles son/visuel, sélecteur de langue & relance Onboarding |
| Profil Formulaire NgRx Pre-fill Fix (#239) | — | ✅ | ✅ | Correction du pré-remplissage des champs username/email depuis Auth store |
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
- ~~**Issue #225** (Ticket #A) : `feat: Vue Client — Écran Scanner QR Code [CLIENT]` (Figma 636:988)~~ ✅ (Mergé PR #256)
- ~~**Issue #226** (Ticket #B) : `feat: Barman — Vue Globale Stock [BARMAN, MANAGER]` (Figma 488:3566)~~ ✅ (Mergé PR #240)
- ~~**Issue #227** (Ticket #C) : `feat: Facturation — Vue Récap Journée [MANAGER]` (Figma 628:1096)~~ ✅ (Mergé PR #241)
- ~~**Issue #228** (Ticket #D) : `feat: Facturation — Vue Règlement Individuel Post-Split [MANAGER, SERVEUR]` (Figma 630:1264)~~ ✅ (Mergé PR #250)
- ~~**Issue #229** (Ticket #E) : `feat: Écran Onboarding — Flow 1ère connexion par rôle [TOUS]` (Figma 633:1100–1173)~~ ✅ (Mergé PR #257)
- ~~**Issue #230** (Ticket #F) : `feat: Composant EmptyState réutilisable [DS]` (Figma 540:1056)~~ ✅ (Mergé PR #253)

### 🟡 Priorité MOYENNE
- ~~**Issue #231** (Ticket #G) : `feat: Vue Barman — Ingrédients en mode Grille de Cartes [BARMAN]` (Figma 488:3524)~~ ✅ (Mergé PR #251)
- ~~**Issue #232** (Ticket #H) : `feat: Manager — Gestion Employés — Pagination et champs Shifts [MANAGER]` (Figma 492:1514)~~ ✅ (Mergé PR #252)
- ~~**Issue #233** (Ticket #I) : `feat: Manager — EDT Planning hebdomadaire complet [MANAGER]` (Figma 492:1556)~~ ✅ (Mergé PR #254)
- ~~**Issue #234** (Ticket #J) : `feat: Profil — Section Préférences et toggle notifications [TOUS]` (Figma 540:946)~~ ✅ (Mergé PR #255)
- ~~**Issue #235** (Ticket #K) : `feat: Facturation — Modal Règlement — Champ Pourboire [MANAGER, SERVEUR]` (Figma 628:1068)~~ ✅ (Mergé PR #249)
- ~~**Issue #236** (Ticket #L) : `feat: Vue Serveur Mobile — Bottom Navigation & MobileTableCard [SERVEUR]` (Figma 632:2240)~~ ✅ (Mergé PR #258)

### 🟢 Priorité BASSE
- ~~**Ticket #M** : `fix: Bug dateLivraison set sur PRET au lieu de LIVREE [BACKEND]` — ✅ Résolu (#224)
- ~~**Ticket #N** : `refactor: Supprimer allow-circular-references [BACKEND]` — ✅ Résolu (#224)
- ~~**Ticket #O** : `fix: Exceptions génériques RuntimeException → exceptions métier [BACKEND]` — ✅ Résolu (#224)
- **Issue #237** (Ticket #P) : `feat: Facturation — Format ticket 58mm [FACTURATION]` (Figma 640:1220)
- ~~**Issue #238** (Ticket #Q) : `fix: Barman — Panel Stock — Alignement Figma complet [BARMAN]` (Figma 488:3340)~~ ✅ (Mergé PR #248)
- ~~**Issue #239** (Ticket #R) : `fix: Profil — Données formulaire non pré-remplies depuis le store NgRx [AUTH]`~~ ✅ (Mergé PR #247)
- **Issue #193** : `test: Tests d'intégration Spring Boot (Testcontainers) et E2E Playwright`

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
| #258 (#236) | Vue Serveur Mobile — Bottom Navigation & MobileTableCard (Figma 632:2240) : Composant Ionic 8 standalone `BottomNavigationComponent` pour les terminaux mobiles (< 768px) avec icônes de navigation, badges de panier/suivi et i18n FR/EN. Composant `MobileTableCardComponent` avec badging de statut, capacité, zone, montant total et chronomètre d'attente coloré selon les exigences WCAG AAA. Support i18n Transloco (`SERVEUR_MOBILE.*`) et attributs `data-testid`. Coordonnées de tests Karma/Jasmine 100% verts (1042/1042 OK). |
| #257 (#229) | Écran Onboarding — Flow 1ère connexion par rôle (Figma 633:1100–1173) : Composant Ionic 8 standalone `OnboardingComponent` (`/onboarding`) affichant des cartes tutoriel guidées adaptées au rôle de l'utilisateur (ADMIN, MANAGER, SERVEUR, BARMAN, CLIENT). Service `OnboardingService` avec persistance de l'état de complétion dans `localStorage`. Bouton de relance du tutoriel depuis la page Profil (`/profile`). Internationalisation FR/EN (`ONBOARDING.*`). Tests unitaires Karma/Jasmine 100% verts (1038/1038 OK). |
| #256 (#225) | Vue Client — Écran Scanner QR Code (Figma 636:988) : Viseur caméra en direct avec animation laser et overlay de cadrage, détection automatique via l'API native `BarcodeDetector` (formats `qr_code`) et redirection automatique vers `/client/commande?table={numero}`. Saisie manuelle du numéro de table en fallback, boutons de simulation de scan, et i18n FR/EN complet (`CLIENT_QR.*`). Coverage de tests unitaires Jasmine/Karma 100% verts (1017/1017 OK). |
| #255 (#234) | Profil — Section Préférences et toggle notifications (Figma 540:946) : Modèle et service `PreferencesService` pour la sauvegarde `localStorage` des réglages utilisateur (notifications sonores/visuelles), sélecteur de langue Transloco FR/EN réactif, et bouton de relance de l'Onboarding. Tests Karma 100% verts. |
| #254 (#233) | Manager — EDT Planning hebdomadaire complet (Figma 492:1556) : Vue planning EDT hebdomadaire interactive par employé avec créneaux horaires de service, bascule de semaine, filtres par rôle et export. Tests unitaires verts. |
| #253 (#230) | Composant EmptyState réutilisable (Figma 540:1056) : Composant UI atomique Ionic 8 avec illustrations emoji, titre, description et bouton d'action paramétrable pour toutes les vues applicatives sans données. |
| #252 (#232) | Manager — Gestion Employés — Pagination et champs Shifts (Figma 492:1514) : Pagination serveur/client de la liste du personnel, ajouts des champs d'horaires et d'affectation de shifts dans la modal d'édition utilisateur. |
| #251 (#231) | Vue Barman — Ingrédients en mode Grille de Cartes (Figma 488:3524) : Affichage sous forme de grille responsive des ingrédients barman avec jauges visuelles de stock, filtres par statut de réapprovisionnement et raccourcis d'incrément/décrément. |
| #250 (#228) | Facturation — Vue Règlement Individuel Post-Split (Figma 630:1264) : Modal et écran de règlement individuel pour le paiement séparé des convives après division d'addition avec choix du mode de règlement et émission de reçus individuels. |
| #249 (#235) | Facturation — Modal Règlement — Champ Pourboire (Figma 628:1068) : Champ de saisie dynamique de pourboire (pourcentage pré-calculé ou montant libre), ajout dans le calcul du montant total encaissé et comptabilisation sur le ticket/facture. |
| #248 (#247/#238) | Conservation BDD au redémarrage & Alignement Stock Barman (Figma 488:3340) : Passage à `CREATE TABLE IF NOT EXISTS` dans `schema.sql` (conservation des comptes admin et données). Restylage complet du panneau de stock Barman. |
| #247 (#239) | Fix Profil NgRx Pre-fill : Correction du pré-remplissage du formulaire profil depuis le store NgRx auth (`selectCurrentUser`). |
| #246 (#245) | Bouton de Traduction Global (Connecté & Non Connecté) : Intégration du bouton de bascule de langue (FR/EN) avec icône globe dans la TopBar (`NavbarComponent`) et bouton flottant fixe sur les vues non connectées (`/login`, `/register`, `/setup`, `/client/*`). |
| #244 (#243) | Filtrage des Cocktails par Allergène : Détection automatique des allergènes (Lait, Gluten, Œufs, Fruits à coque, Arachides, Sulfites, Soja), filtres par exclusion interactive et badges ⚠️. |
| #242 | Vue Grille Cocktails Figma & Auto-création BDD Multi-Environnements : Vue grille cocktails avec cartes responsives, verres 3D, upload photo (`POST /api/cocktails/{id}/image`) et auto-création PostgreSQL (`DatabaseAutoCreationConfig.java`). |
| #241 (#227) | Facturation — Vue Récap Journée [MANAGER] (Figma 628:1096) : Endpoint backend `GET /api/factures/daily-recap` (CA TTC, CA HT, TVA, panier moyen, total clients) + generation PDF Z-Report A4. |
| #240 (#226) | Vue Globale des Stocks Barman (Figma 628:1372) : Ingestion WebSocket STOMP `/topic/stock/alerte`, jauges visuelles, filtres de catégorie, mode Liste/Grille, et ajustement rapide du stock. |
