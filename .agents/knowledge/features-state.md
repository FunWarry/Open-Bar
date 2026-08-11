# OpenBar — État des Features & Roadmap

> Dernière mise à jour : 11 août 2026 — PR #287 (#276) / PR #286 (#283) : Planning hebdomadaire EDT (filtres par poste, toggle sans créneau, indicateurs d'heures par employé & synchronisation KIs)

## Tableau des Features

| Feature | Backend | Frontend | Tests | Notes |
|---------|---------|----------|-------|-------|
| Documentation complète & API OpenAPI/Swagger (#192/#194) | ✅ | ✅ | ✅ | JavaDoc, TSDoc, OpenAPI 3.0 |
| Quality Gate SonarCloud & Sécurité 100% sans `@SuppressWarnings` | ✅ | ✅ | ✅ | |
| Planning d'équipe & Gestion des Shifts (#274/#275/#276/#283) | ✅ | ✅ | ✅ | Backend REST /api/shifts (#274), Vue /employees & Modales créneaux/presets/fermetures (#275), Grille EDT hebdomadaire /schedule avec filtres postes & indicateurs d'heures (#276), Mode comparaison publication STOMP (#283) |
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
| Gestion directe des Étages (#222/#223) | ✅ | ✅ | ✅ | EtageEntity, EtageController, EtageService, ZoneManagerComponent onglet Étages |
| TopBar globale conforme Figma (#208) | — | ✅ | ✅ | NavbarComponent |
| NavBar / Sidebar 64-220px globale Figma (#209) | — | ✅ | ✅ | SidebarComponent |

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
- ~~**Issue #232** (Ticket #H) : `feat: Manager — Gestion Employés — Pagination et champs Shifts [MANAGER]` (Figma 492:1514)~~ ✅ (Mergé PR #279 / #278)
- ~~**Issue #233** (Ticket #I) : `feat: Manager — EDT Planning hebdomadaire complet [MANAGER]` (Figma 492:1556)~~ ✅ (Mergé PR #287 / #286 / #279)
- ~~**Issue #234** (Ticket #J) : `feat: Profil — Section Préférences et toggle notifications [TOUS]` (Figma 540:946)~~ ✅ (Mergé PR #255)
- ~~**Issue #235** (Ticket #K) : `feat: Facturation — Modal Règlement — Champ Pourboire [MANAGER, SERVEUR]` (Figma 628:1068)~~ ✅ (Mergé PR #249)
- ~~**Issue #236** (Ticket #L) : `feat: Vue Serveur Mobile — Bottom Navigation & MobileTableCard [SERVEUR]` (Figma 632:2240)~~ ✅ (Mergé PR #258)

### 🟢 Priorité BASSE
- ~~**Ticket #M** : `fix: Bug dateLivraison set sur PRET au lieu de LIVREE [BACKEND]` — ✅ Résolu (#224)
- ~~**Ticket #N** : `refactor: Supprimer allow-circular-references [BACKEND]` — ✅ Résolu (#224)
- ~~**Ticket #O** : `fix: Exceptions génériques RuntimeException → exceptions métier [BACKEND]` — ✅ Résolu (#224)
- ~~**Issue #237** (Ticket #P) : `feat: Facturation — Format ticket 58mm [FACTURATION]` (Figma 640:1220)~~ ✅ (Mergé PR #259)
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
| #288 (#284) | Contrôle d'accès strict sur l'EDT & Heures réelles : Vérification de permissions dans `EmployeeShiftService.updateShift()` (managers/admins ont modification totale sur tous les créneaux ; employés réguliers ne peuvent modifier que leurs propres créneaux et uniquement leurs horaires de pointage réel `heureDebutReelle`, `heureFinReelle`, `heuresSup`, `heuresEffectuees`, `notes` ; rejet HTTP 403 Forbidden unifié via `GlobalExceptionHandler`). Côté frontend (`EmployeeShiftModalComponent`) : désactivation des champs de planification pour les employés, affichage des bandeaux d'information (lecture seule / pointage personnel), masquage des actions non autorisées. i18n FR/EN complet. Tests Backend & Karma 100% verts, SonarCloud Quality Gate PASSED. |
| #287 (#276) | Planning hebdomadaire EDT — Filtres par poste & Indicateurs d'heures : Ajout de la barre de filtres (Tous, Barman, Serveur, Manager), toggle 'Masquer sans créneau', calcul et affichage dynamique des heures totales hebdomadaires par employé (`getEmployeeTotalHours`), état vide stylé en variables CSS adaptatives, et 100% tests Karma / SonarCloud PASSED. |
| #286 (#283) | Fix bouton comparaison EDT & UX shifts : synchronisation `forkJoin` pour le chargement du planning et de la publication (élimine la disparition du bouton de comparaison au changement de semaine), clic sur cellule vide ouvre directement le formulaire de création pré-rempli (`initialDate`, `openInCreateMode`), en-tête employé converti en `<button>` sémantique pour ouvrir la liste des shifts d'une personne, et 100% tests Karma / SonarCloud Quality Gate PASSED. |
| #280 (#275) | Fix Mode Comparaison EDT : Correction de la sérialisation Jackson des dates dans `WeekSchedulePublicationService.java` (`disable(WRITE_DATES_AS_TIMESTAMPS)` & logging des erreurs), parsing JS récursif et tolérant (`parsePublishedShifts()`), comparaison précise des statuts `ADDED`/`MODIFIED`/`DELETED`/`UNCHANGED`, et restylage CSS haute visibilité des cases du planning en mode comparaison (`.diff-added` vert glowing, `.diff-modified` ambre avec horaire initial, `.diff-deleted` rouge hachuré ghost, `.diff-dimmed` atténué). |
| #279 (#275) | Planning d'équipe & Shifts Employés par personne (Figma 540:1022) : Vue Employés Manager (`/employees`), modal de gestion des créneaux par personne (`EmployeeShiftModalComponent`), modal de fermeture d'établissement (`ClosureConfigModalComponent`), modal d'exceptions de fermeture par jour (`DayClosureModalComponent`), configuration des modèles de shifts (`ShiftPresetsConfigComponent`), duplication par glisser-déposer, raccourcis clavier (Ctrl+C, Ctrl+V, Del, Esc), publication d'emploi du temps avec notifications STOMP temps réel `/topic/schedule-publications`, et Quality Gate SonarCloud 80.8% OK. |
| #278 (#274) | Backend Gestion des Shifts Employés (ShiftController, Service, Repository) : Validation des payloads DTOs via annotations Jakarta et @Valid. Endpoints REST sous `/api/shifts` (GET par ID, par semaine avec calcul de date pivot, par plage from/to, par utilisateur, POST, PUT, DELETE avec `@PreAuthorize`). Tests unitaires 100% verts (407 backend OK). Correctifs UI style des modals et clic ligne utilisateur. |
| #273 (#272) | Modal d'édition ingrédient au clic sur carte, suppression vue détail et correction notifs stock : Fix du payload WebSocket d'alerte stock dans `NotificationService.java` (alias getters `getNom`/`getQuantiteActuelle`) et `notification.service.ts` (fallback champs alternatifs). Fusion de la page `/ingredients/:id` dans `IngredientFormComponent` utilisé en `IonModal` (mode lecture seule si pas de droits d'édition). Suppression du composant `IngredientDetailComponent` obsolète. Clic sur carte/ligne ouvre le modal ; `stopPropagation` sur ajustements rapides (-10/-1/+1/+10) et suppression. Barre de contrôle alignée sur le style `TableListComponent` : pilules de statut (Tous/Normaux/En alerte/Épuisés) avec compteurs, filtres Catégorie / Unité / Tri / Vue. 8 options de tri (nom ASC/DESC, stock ASC/DESC, seuil ASC/DESC, statut alerte, catégorie). i18n FR/EN complet. Tests : Backend 402/402 OK, Frontend 1065/1065 OK, SonarCloud PASSED. |
| #271 (#270) | Ouverture détails commande par clic sur carte, modal avec actions et popup de confirmation : Permet l'ouverture automatique des détails d'une commande dans un modal `CommandeDetailModalComponent` au clic sur n'importe quel endroit d'une carte de commande (Kanban & Barman). Intègre les boutons d'action contextuels dans le modal (progression statut `EN_ATTENTE` -> `EN_PREPARATION` -> `PRET` -> `LIVREE`, et annulation avec popup de confirmation `AlertController`). Uniformisation des cartes avec suppression du bouton yeux explicite et gestion de la propagation d'événements. Support i18n FR/EN complet. Tests Karma (1059/1059 OK). |
| #263 (#262) | Refonte Suivi des Commandes (Figma 'Serveur — Suivi commandes') : Implémentation du mode d'affichage dual Kanban 4 colonnes (En Attente, En Préparation, Prêt à Servir, Livrées/Réglées) et Vue Liste Tableau. Swapper de vue réactif, filtre de recherche multi-critères, toggle d'affichage des livrées, badging de statut et détection automatique des retards/urgences (Priority). Sub-composant atomique `CommandeCardComponent` pour l'élimination des duplications de code template HTML. Synchronisation i18n Transloco 100% FR/EN. Tests Karma 1048/1048 OK. |
| #259 (#237) | Facturation — Format ticket 58mm (Figma 640:1220) : Ajout de la gestion du format d'impression thermique 58mm en complément du 80mm. Champ backend `ticketFormat` dans `EstablishmentConfig`, `schema.sql`, DTOs et services. Formulaire de configuration Admin `EtablissementComponent` avec sélecteur de format. Composant `TicketReceiptComponent` avec sélecteur dynamique (80mm/58mm), mise en page compacte et règles CSS `@media print` adaptées. Clefs i18n Transloco FR/EN. Tests Karma (1044/1044 OK) et backend Spring Boot 100% verts. |
| #258 (#236) | Vue Serveur Mobile — Bottom Navigation & MobileTableCard (Figma 632:2240) : Composant Ionic 8 standalone `BottomNavigationComponent` pour les terminaux mobiles (< 768px) avec icônes de navigation, badges de panier/suivi et i18n FR/EN. Composant `MobileTableCardComponent` avec badging de statut, capacité, zone, montant total et chronomètre d'attente coloré selon les exigences WCAG AAA. Support i18n Transloco (`SERVEUR_MOBILE.*`) et attributs `data-testid`. Coordonnées de tests Karma/Jasmine 100% verts (1042/1042 OK). |
| #257 (#229) | Écran Onboarding — Flow 1ère connexion par rôle (Figma 633:1100–1173) : Composant Ionic 8 standalone `OnboardingComponent` (`/onboarding`) affichant des cartes tutoriel guidées adaptées au rôle de l'utilisateur (ADMIN, MANAGER, SERVEUR, BARMAN, CLIENT). Service `OnboardingService` avec persistance de l'état de complétion dans `localStorage`. Bouton de relance du tutoriel depuis la page Profil (`/profile`). Internationalisation FR/EN (`ONBOARDING.*`). Tests unitaires Karma/Jasmine 100% verts (1038/1038 OK). |
| #256 (#225) | Vue Client — Écran Scanner QR Code (Figma 636:988) : Viseur caméra en direct avec animation laser et overlay de cadrage, détection automatique via l'API native `BarcodeDetector` (formats `qr_code`) et redirection automatique vers `/client/commande?table={numero}`. Saisie manuelle du numéro de table en fallback, boutons de simulation de scan, et i18n FR/EN complet (`CLIENT_QR.*`). Coverage de tests unitaires Jasmine/Karma 100% verts (1017/1017 OK). |
| #255 (#234) | Profil — Section Préférences et toggle notifications (Figma 540:946) : Modèle et service `PreferencesService` pour la sauvegarde `localStorage` des réglages utilisateur (notifications sonores/visuelles), sélecteur de langue Transloco FR/EN réactif, et bouton de relance de l'Onboarding. Tests Karma 100% verts. |
| #254 (#233) | Manager — EDT Planning hebdomadaire complet (Figma 492:1556) : Vue planning EDT hebdomadaire interactive par employé avec créneaux horaires de service, bascule de semaine, filtres par rôle et export. Tests unitaires verts. |
| #253 (#230) | Composant EmptyState réutilisable (Figma 540:1056) : Composant UI atomique Ionic 8 avec illustrations emoji, titre, description et bouton d'action paramétrable pour toutes les vues applicatives sans données. |
| #248 (#247/#238) | Conservation BDD au redémarrage & Alignement Stock Barman (Figma 488:3340) : Passage à `CREATE TABLE IF NOT EXISTS` dans `schema.sql` (conservation des comptes admin et données). Restylage complet du panneau de stock Barman. |
| #247 (#239) | Fix Profil NgRx Pre-fill : Correction du pré-remplissage du formulaire profil depuis le store NgRx auth (`selectCurrentUser`). |
| #246 (#245) | Bouton de Traduction Global (Connecté & Non Connecté) : Intégration du bouton de bascule de langue (FR/EN) avec icône globe dans la TopBar (`NavbarComponent`) et bouton flottant fixe sur les vues non connectées (`/login`, `/register`, `/setup`, `/client/*`). |
| #244 (#243) | Filtrage des Cocktails par Allergène : Détection automatique des allergènes (Lait, Gluten, Œufs, Fruits à coque, Arachides, Sulfites, Soja), filtres par exclusion interactive et badges ⚠️. |
| #242 | Vue Grille Cocktails Figma & Auto-création BDD Multi-Environnements : Vue grille cocktails avec cartes responsives, verres 3D, upload photo (`POST /api/cocktails/{id}/image`) et auto-création PostgreSQL (`DatabaseAutoCreationConfig.java`). |
| #241 (#227) | Facturation — Vue Récap Journée [MANAGER] (Figma 628:1096) : Endpoint backend `GET /api/factures/daily-recap` (CA TTC, CA HT, TVA, panier moyen, total clients) + generation PDF Z-Report A4. |
| #240 (#226) | Vue Globale des Stocks Barman (Figma 628:1372) : Ingestion WebSocket STOMP `/topic/stock/alerte`, jauges visuelles, filtres de catégorie, mode Liste/Grille, et ajustement rapide du stock. |
