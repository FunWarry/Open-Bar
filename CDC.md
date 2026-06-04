# 🍹 OpenBar — Cahier des charges

> Application de gestion de bar en temps réel · Ippon Technologies · Mai 2026

---

## Table des matières

1. [Contexte et objectifs](#1-contexte-et-objectifs)
2. [Stack technique](#2-stack-technique)
3. [Rôles utilisateurs](#3-rôles-utilisateurs)
4. [Modèle de données](#4-modèle-de-données)
5. [WebSocket STOMP](#5-websocket-stomp)
6. [Fonctionnalités](#6-fonctionnalités)
7. [Design System Figma](#7-design-system-figma)
8. [Dette technique](#8-dette-technique)
9. [Roadmap](#9-roadmap)
10. [Conventions de code](#10-conventions-de-code)
11. [Décisions actées](#11-décisions-actées)
12. [Prochaine session](#12-prochaine-session)

---

## 1. Contexte et objectifs

OpenBar digitalise et fluidifie l'ensemble du cycle opérationnel d'un bar : prise de commande → préparation → service → facturation, avec communication temps réel entre les acteurs.

### Problème adressé

- Coordination inefficace entre serveurs et barmans (tickets papier, appels oraux)
- Absence de visibilité temps réel sur l'état des commandes
- Gestion manuelle des stocks
- Aucun outil de supervision pour les managers (stats, plan de salle)
- Facturation longue et source d'erreurs

### Solution

Application web multi-rôles avec WebSocket pour la communication temps réel entre les 3 profils : serveurs, barmans et managers/admins.

---

## 2. Stack technique

#### Stack actuelle (code existant)

| Couche | Technologie | Version | Notes |
|--------|-------------|---------|-------|
| Backend | Spring Boot | 3.3.3 | Runtime Java 22 |
| Base de données | PostgreSQL | — | Via Docker Compose |
| ORM | JPA / Hibernate | via Spring | Lombok `@Data` sur entités |
| Sécurité | Spring Security + JWT | JJWT 0.11.5 | Filter custom |
| Temps réel | WebSocket STOMP | via Spring | 4 topics actifs |
| Frontend | Angular | 19 | Standalone components |
| UI | Angular Material | 19 | ⚠️ À migrer (voir stack cible) |
| State management | NgRx | 19 | Auth uniquement |
| HTTP | RxJS / HttpClient | 7.8 | — |

#### Stack cible (migration décidée)

| Couche | Technologie | Version | Raison |
|--------|-------------|---------|--------|
| Frontend | Angular | 19 | Inchangé |
| UI mobile | **Ionic** | 8+ | Mobile/tablet-first, composants natifs |
| Build natif | **Capacitor** | 6+ | iOS + Android depuis le même codebase |
| Canvas plan de salle | **Konva.js** | — | Canvas 2D libre, drag & drop, rotation |
| Backend | Spring Boot | 3.3.3 | Inchangé |

> **Décision actée** : Angular Material n'est pas adapté pour un usage mobile/tablet-first (écrans de bar, tablettes serveurs, téléphones). La migration vers **Ionic + Angular + Capacitor** permet de cibler iOS, Android et navigateur depuis un seul codebase.

#### Design

| Outil | Détail |
|-------|--------|
| Figma | fileKey `XSVwFk64kgtqgUN9n5qoMw` — 5 pages, 39+ composants |
| Approche | Design first — tous les écrans designés en Figma avant implémentation |

### Architecture backend

Pattern strict : **Controller → Service → Repository** — aucun saut de couche toléré.

```
src/main/java/com/bar/gestioncocktail/
├── config/       # SecurityConfig, WebSocketConfig, JwtProperties
├── controller/   # REST endpoints (@RolesAllowed)
├── service/      # Logique métier (@Transactional sur writes)
├── repository/   # Spring Data JPA
├── model/        # Entités JPA (@Data Lombok, @PrePersist/@PreUpdate)
├── dto/          # LoginRequest / LoginResponse (à étendre)
└── security/     # JwtAuthenticationFilter, JwtAuthorizationFilter, JwtTokenProvider
```

### Architecture frontend

Feature-based : `features/` + `core/`. Lazy loading sur toutes les routes (`loadComponent`). NgRx uniquement pour l'auth ; le reste est géré en services directs.

### Lancer le projet

```bash
# Base de données
cd backend/src/main/resources && docker compose up -d

# Backend
cd backend && mvn spring-boot:run   # → http://localhost:8080

# Frontend
cd frontend && npm install && ng serve   # → http://localhost:4200
```

---

## 3. Rôles utilisateurs

L'enum `UserRole` définit 3 rôles dans le code actuel. ⚠️ `BARMEN` est une typo — devrait être `BARMAN`. Le rôle `MANAGER` est à ajouter (absent du code, présent dans le Figma).

| Rôle | Nature | Accès | Interface | Couleur |
|------|--------|-------|-----------|---------|
| `ADMIN` | Maintenance technique | Tout — gestion users, config système | Interface admin — **pas un rôle métier** | Partagé Manager |
| `MANAGER` | Rôle métier principal | Supervision complète du bar | Plan de salle (config + supervision), stats, facturation | `#f39c12` |
| `SERVEUR` | Rôle métier | Tables, commandes (création/suivi) | Plan de salle (lecture), prise de commande | `#2ecc71` |
| `BARMEN` | Rôle métier | Commandes (préparation), stocks, cocktails | Kanban, stocks, catalogue cocktails | `#4fc3f7` |

> **Décisions actées sur les rôles :**
> - `ADMIN` = accès de maintenance technique uniquement, pas un rôle opérationnel bar
> - `MANAGER` est le vrai responsable métier du bar au quotidien — rôle à ajouter au backend
> - `BARMEN` peut masquer un cocktail si rupture d'ingrédient (accès gestion cocktails)

Guards Angular : `AuthGuard`, `RoleGuard`, `AdminGuard`.

---

## 4. Modèle de données

```
users ──< user_roles
users ──< tables (serveur_id)
tables ──< commandes ──< commande_items ──< cocktails
                                         └──< cocktail_variantes
cocktails ──< cocktail_ingredients ──< ingredients
tables ──< factures ──< facture_items
tables ──< table_sessions              ← QR code client (token temporaire par scan)
zones ──< tables                       ← Zones du plan de salle (polygones libres JSON)
users ──< audit_logs
```

> **Plan de salle** : les zones sont des polygones libres (coordonnées JSON), pas des rectangles. Les tables ont des formes rondes ou carrées, librement repositionnables et redimensionnables via Konva.js.
>
> **QR code** : chaque table a un QR code permanent lié à `table.id`. Le scan crée une `TableSession` avec un token temporaire. L'interface client est non authentifiée, ultra-légère, indépendante du bundle staff.

### Cycle de vie d'une commande

```
EN_ATTENTE → EN_PREPARATION → PRET → LIVREE → REGLEE
                                            ↘ ANNULEE (depuis n'importe quel état)
```

| Statut | Timestamp auto | Acteur | Transition depuis |
|--------|---------------|--------|-------------------|
| `EN_ATTENTE` | — | Serveur (création) | — (initial) |
| `EN_PREPARATION` | `datePreparation` | Barman | EN_ATTENTE |
| `PRET` | `dateLivraison` ⚠️ | Barman | EN_PREPARATION |
| `LIVREE` | — | Serveur | PRET |
| `REGLEE` | `dateReglement` | Manager / Serveur | LIVREE |
| `ANNULEE` | — | N'importe quel rôle | Tout statut |

> ⚠️ **Bug** : `dateLivraison` est set sur `PRET` au lieu de `LIVREE` dans `CommandeService.changerStatut()`.

---

## 5. WebSocket STOMP

| Topic | Événement | Consommateurs |
|-------|-----------|---------------|
| `/topic/commandes` | Nouvelle commande créée | Barman, Manager |
| `/topic/commandes/{id}` | Changement de statut | Barman, Serveur, Manager |
| `/topic/tables` | Occupation / libération table | Serveur, Manager |
| `/topic/stock/alerte` | Stock faible détecté | Barman, Manager |

Service frontend : `websocket.service.ts` — ⚠️ abonnements partiellement implémentés.

---

## 6. Fonctionnalités

| Feature | Backend | Frontend | Design Figma | Priorité |
|---------|---------|----------|--------------|----------|
| Auth JWT | ✅ | ✅ | ✅ | — |
| Gestion users (admin) | ✅ | ✅ | ✅ | — |
| **Cocktails CRUD (liste barman)** | ✅ | ✅ | ✅ designé | — |
| **Cocktail — détail / fiche recette** | ✅ | ✅ | ✅ designé | — |
| **Cocktail — création / édition** | ✅ | ✅ | ✅ designé | — |
| Ingrédients CRUD | ✅ | ✅ | ✅ | — |
| **Ingrédients — gestion détaillée** | ✅ | ✅ | ✅ designé | — |
| Tables | ✅ | ✅ | ✅ | — |
| Commandes (kanban barman) | ✅ | ✅ | ✅ | — |
| **Stock — vue rapide (shift)** | ✅ | ✅ | ✅ | — |
| **Stock — vue globale (gestion complète)** | ✅ | ⚠️ partiel | ✅ designé | 🟡 Moyenne |
| Plan de salle (manager) | ✅ | ✅ | ✅ | — |
| Notifications WebSocket | ✅ | ⚠️ partiel | ✅ | 🔴 Haute |
| Factures (frontend) | ✅ | ❌ | ⚠️ partiel | 🔴 Haute |
| Déstockage auto à la commande | ❌ | — | — | 🔴 Haute |
| Dashboard / statistiques | ❌ | ❌ | ❌ | 🟡 Moyenne |
| Plan de salle interactif | ❌ | ❌ | ⚠️ esquissé | 🟡 Moyenne |
| QR code commande client | ❌ | ❌ | ✅ designé | 🟡 Moyenne |
| Fusion de tables | ❌ | ❌ | ✅ designé | 🟡 Moyenne |
| Division d'addition | ❌ | ❌ | ❌ | 🟢 Basse |
| Export PDF factures | ❌ | ❌ | ❌ | 🟢 Basse |
| Saisonnalité cocktails | ⚠️ modèle OK | ❌ | ❌ | 🟢 Basse |

---

## 7. Design System Figma

**Fichier** : `XSVwFk64kgtqgUN9n5qoMw` — 5 pages, **39 composants** (état mai 2026).

> **Principe** : composants en cascade, comme Angular/React. Chaque composant parent n'utilise que des instances de composants enfants — jamais de primitives brutes (rectangles, ellipses, textes).

### 7.1 Tokens couleur

| Token | Valeur | Usage |
|-------|--------|-------|
| `BG` | `#0f0f1a` | Fond global |
| `Surface` | `#1a1a2e` | Cards, panels |
| `Surface2` | `#262640` | Éléments surélevés |
| `Surface3` | `#323250` | Bordures, dividers |
| `TextPrimary` | `#e8e8f0` | Texte principal |
| `TextMuted` | `#666680` | Texte secondaire |
| `Accent` | `#7c3aed` | Violet — actions primaires, actif |
| `Barman` | `#4fc3f7` | Couleur rôle Barman |
| `Manager` | `#f39c12` | Couleur rôle Manager |
| `Serveur` | `#2ecc71` | Couleur rôle Serveur |
| `En attente` | `#f59e0b` | Statut commande |
| `En préparation` | `#0ea5e9` | Statut commande |
| `Prêtes` | `#22c55e` | Statut commande |
| `Servies` | `#4d5a80` | Statut commande |

### 7.2 Inventaire des composants

#### Atomiques (feuilles — aucune dépendance)

| Composant | Variants | Taille | Usage |
|-----------|----------|--------|-------|
| `Avatar` | 3 (Barman/Manager/Serveur) | 32×32 | Initiale colorée dans UserFooter |
| `StatusBadge` | 6 statuts commande | variable | Statut dans CommandeCard |
| `TableBadge` | 5 | variable | Numéro de table |
| `RoleBadge` | 3 rôles | 188×28 | Chip rôle dans NavBar |
| `NavItem` | 2 (Active/Default) | 204×44 | Entrée de navigation sidebar |
| `IngredientLine` | 2 (Dark/Light) | 180×18 | "× N Cocktail" dans CommandeCard |
| `FilterChip` | 2 (Active/Default) | 132×32 | Filtres topbar barman, tabs stocks |
| `KanbanColHeader` | 4 statuts | 220×40 | En-têtes colonnes kanban |
| `ProgressSegment` | 4 statuts | 24×170 | Barre latérale sidebar barman |
| `StockAlertBanner` | 1 | 960×44 | Bannière alerte stock |
| `StockSeverityBadge` | 3 (Critique/Faible/Normal) | 96×22 | Niveau de stock |
| `StockProgressBar` | 3 niveaux | 436×8 | Barre progression stock |
| `TableNode` | 12 (Round/Square × 6 statuts) | 64×64 | Nœud plan de salle |
| `LegendItem` | 6 statuts table | 120×20 | Légende plan de salle |
| `QuantityStepper` | 2 (Active/Default) | 80×32 | Sélecteur quantité QR client |
| `CategoryTab` | 2 (Active/Default) | 80×32 | Onglets catégories QR client |
| `StatusBar` | 1 | 390×44 | Barre statut iOS (mobile) |
| `PrioBadge` | 2 (Urgent/Normal) | 100×28 | Badge ⚡ URGENT dans modal |
| `UrgencyStripe` | 2 (Urgent/Normal) | 800×6 | Barre déco haut du modal |
| `SectionLabel` | 2 (Icon=None/Clock) | 200×20 | Titre de section dans modal |

#### Composites intermédiaires (utilisent des atomiques)

| Composant | Variants | Dépendances | Usage |
|-----------|----------|-------------|-------|
| `UserFooter` | 3 rôles | `Avatar` | Bas de NavBar |
| `MobileHeader` | 2 (Home/Back) | — | Header mobile QR |
| `ProductCard` | 2 (Default/InCart) | `QuantityStepper` | Carte produit QR |
| `CartItem` | 1 | `QuantityStepper` | Item panier QR |
| `StockRow` | 3 niveaux | `StockSeverityBadge` + `StockProgressBar` + `ActionButton`×2 | Ligne stock |
| `PanelOrderItem` | 3 (En prépa/Prête/Servie) | — | Item commande side panel manager |
| `TotalRow` | 1 | — | Ligne total side panel |
| `ActivityLog` | 1 | — | Historique récent side panel |
| `MiniCommandeCard` | 4 statuts | — | Carte mini kanban fond stocks |
| `TimerWidget` | 1 | — | Timer modal détail barman |
| `NotesCard` | 2 (Serveur/Allergie) | — | Carte notes contextuelles |
| `CanvasToolbar` | 1 | — | Toolbar verticale plan de salle |

#### Composites hauts (niveau écran)

| Composant | Variants | Dépendances | Usage |
|-----------|----------|-------------|-------|
| `NavBar` | 3 rôles | `NavItem` + `RoleBadge` + `UserFooter` → `Avatar` | 220×600 sidebar gauche |
| `Topbar` | 2 (Manager/Serveur) | — | 1024×56 barre du haut |
| `ActionButton` | 12 (Primary/Secondary/Danger/Ghost × Default/Hover/Disabled) | — | CTA partout |
| `CommandeCard` | 8 variants | `StatusBadge` + `IngredientLine` + `ActionButton` | Carte kanban barman |
| `OrderItem` | 4 (En prépa/Prête × Note=Oui/Non) | — | Ligne item modal commande |
| `StatusTimeline` | 1 | — | Timeline statuts modal commande |
| `ConfirmModal` | 1 | `ActionButton`×2 | Dialog confirmation fusion |

### 7.3 État des vues

#### Vue Barman (8 écrans)

| Écran | Score composants | Statut | Notes |
|-------|-----------------|--------|-------|
| Interface Barman | 19/20 — 95% | ✅ Complet | Topbar = frame container (normal) |
| Barman — Stocks *(vue shift)* | Élevé | ✅ Complet | Édition rapide pendant le service |
| Barman — Commande détail | 12/13 — 92% | ✅ Complet | Modal Header = container (normal) |
| Barman — Liste Cocktails | Élevé | ✅ Nouveau | Grille 3×3, FilterChips, ActionButtons |
| Barman — Détail Cocktail | Élevé | ✅ Nouveau | IngredientLine, variantes, stock status |
| Barman — Création Cocktail | Élevé | ✅ Nouveau | Formulaire, FilterChips catégorie, étapes |
| Barman — Gestion Ingrédients | Élevé | ✅ Nouveau | StockRow × 5, AlertBanner, FilterChips |
| Barman — Vue Globale Stock | Élevé | ✅ Nouveau | Stat cards, StockRow par catégorie, actions |

#### Vue Manager (4 écrans)

| Écran | Score composants | Statut | Reste à faire |
|-------|-----------------|--------|---------------|
| Plan de salle | ~20 instances | ✅ Complet | — |
| Serveur — Plan | ~23 instances | ✅ Complet | Frame Statut à peaufiner |
| Manager — Fusion | ~13 instances | ✅ Complet | — |
| Fusion — Résultat | ~12 instances | ⚠️ Partiel | T4/T6 fusionnées = primitives brutes |

#### Autres vues

| Vue / Écran | Score composants | Statut | Reste à faire |
|-------------|-----------------|--------|---------------|
| Vue Client QR — Phone | Élevé | ✅ Complet | — |
| Vue Client QR — Panier | Élevé | ✅ Complet | — |
| Vue Serveur | 0 | ❌ Vide | Page à créer from scratch |
| Dashboard / Stats | 0 | ❌ Non designé | À créer from scratch |

### 7.4 Conventions scripting plugin Figma

```js
// TOUJOURS switcher de page avant de lire children
await figma.setCurrentPageAsync(targetPage);

// Snapshot avant boucle de modification (évite les mutations en cours de lecture)
const snap = [...node.children];

// Récupérer un nœud par ID (évite les références stales)
const node = figma.getNodeById('17:120');

// Supprimer en sécurité
function safeRemove(n) { if (n) { try { n.remove(); } catch(e) {} } }

// Charger les fonts AVANT toute écriture de texte
await Promise.all(['Regular', 'Semi Bold', 'Bold'].map(s =>
  figma.loadFontAsync({ family: 'Inter', style: s }).catch(() => {})
));

// Créer un COMPONENT_SET
const set = figma.combineAsVariants([comp1, comp2], page);
set.name = 'NomDuComposant';
set.x = X; set.y = Y;

// Instancier et overrider un texte
const inst = variant.createInstance();
inst.x = x; inst.y = y;
parent.appendChild(inst);
try {
  const txt = inst.findAll(n => n.type === 'TEXT')[0];
  if (txt) txt.characters = 'nouveau texte';
} catch(e) {}
```

---

## 8. Dette technique

| # | Problème | Localisation | Risque | Priorité |
|---|----------|-------------|--------|----------|
| 1 | Secret JWT hardcodé | `application.yml` | Sécurité critique | 🔴 Haute |
| 2 | `allow-circular-references: true` | `application.yml` | Smell design circulaire | 🟡 Moyenne |
| 3 | Bug `dateLivraison` set sur `PRET` | `CommandeService.changerStatut()` | Données incorrectes | 🟡 Moyenne |
| 4 | Aucun test backend | Tout le backend | Régressions silencieuses | 🔴 Haute |
| 5 | Pas de DTOs de sortie | Tous les controllers | Fuite données + boucles JSON | 🟡 Moyenne |
| 6 | Typo `BARMEN` → `BARMAN` | Enum `UserRole` | Confusion codebase | 🟢 Basse |
| 7 | Exceptions génériques (`RuntimeException`) | Services | Messages d'erreur peu utiles | 🟢 Basse |

---

## 9. Roadmap

### Phase 1 — Stabilisation (court terme)

- [ ] Corriger le bug `dateLivraison` dans `CommandeService`
- [ ] Externaliser le secret JWT en variable d'environnement
- [ ] Écrire les premiers tests backend (unitaires services + intégration commandes)
- [ ] Introduire des DTOs de sortie pour les controllers principaux
- [ ] Compléter les abonnements WebSocket côté frontend (`websocket.service.ts`)

### Phase 2 — Migration stack + features prioritaires

- [ ] **Migration Angular Material → Ionic** — remplacer les composants UI par des équivalents Ionic
- [ ] **Intégration Capacitor** — configuration iOS + Android
- [ ] **Ajout du rôle MANAGER** — backend (enum, SecurityConfig, guards) + frontend
- [ ] **Facturation frontend** — l'API backend est prête, il manque l'UI Ionic
- [ ] **Déstockage automatique** — hook dans `changerStatut()` sur `EN_PREPARATION`
- [ ] **Dashboard manager** — stats temps réel (commandes/heure, revenus, stock critique)
- [ ] **Vue Serveur Figma + Ionic** — plan de salle serveur, prise de commande
- [ ] **i18n** — mise en place du système de traduction Angular

### Phase 3 — Features avancées

- [ ] Plan de salle interactif avec **Konva.js** — canvas libre, drag & drop, rotation, zones polygones
- [ ] QR code client — `TableSession` + interface non authentifiée (déjà designé en Figma)
- [ ] Fusion de tables — modèle de données + API + UI Manager
- [ ] Division d'addition — UI + logique de répartition
- [ ] Export PDF factures — génération backend (iText ou JasperReports)

### Phase 4 — Personnalisation

- [ ] Saisonnalité cocktails — le modèle backend existe, connecter l'UI
- [ ] Alertes stock configurables — seuils par ingrédient
- [ ] Historique / audit complet — `AuditLogService` déjà en place

---

## 10. Conventions de code

### Backend

- Injection par **constructeur** uniquement — pas `@Autowired` sur champs
- `@Data` Lombok sur toutes les entités JPA
- `@PrePersist` / `@PreUpdate` pour `createdAt` / `updatedAt`
- `@Transactional` sur toutes les méthodes write de service
- Pattern **Controller → Service → Repository** — aucun saut de couche

### Frontend Angular + Ionic

- Architecture feature-based : `features/` + `core/`
- Lazy loading sur toutes les routes (`loadComponent`)
- NgRx uniquement pour l'authentification
- **Ionic** pour tous les composants UI (pas Angular Material — migration en cours)
- Services directs (pas NgRx) pour le reste de l'état
- i18n activé dès le départ (Angular i18n ou ngx-translate)

### Checklist ajout d'une feature

**Backend**

1. Modèle JPA dans `model/` avec `@Data`, `@PrePersist`, `@PreUpdate`
2. Ligne dans `schema.sql`
3. Repository dans `repository/` (extends `JpaRepository<Entity, Long>`)
4. Service dans `service/` avec `@Transactional` sur les writes
5. Controller dans `controller/` avec `@RolesAllowed`
6. `AuditLogService` si pertinent

**Frontend**

1. Modèle TypeScript dans `core/models/` ou dossier feature
2. Service HTTP dans le dossier feature
3. Composants (list / form / detail) sous `features/<nom>/`
4. Route lazy-loadée dans `app.routes.ts`
5. Lien dans la navbar si pertinent

**Design Figma**

1. Composant atomique dans le DS (si nouvel élément réutilisable)
2. Composant composite si combinaison de plusieurs atomiques
3. Instance dans les écrans concernés — jamais de primitives brutes
4. Respecter la hiérarchie : tokens → atomiques → composites → écrans

---

## 11. Décisions actées

Ces choix ont été actés et ne doivent pas être remis en question sans raison explicite.

### Stack frontend : Ionic + Angular + Capacitor

**Décision :** migrer de Angular Material vers Ionic + Angular + Capacitor.

**Pourquoi :** l'application est utilisée sur tablettes (barmans, serveurs) et téléphones (serveurs en salle) — Angular Material n'est pas adapté aux interactions tactiles mobile-first. Ionic fournit des composants natifs adaptatifs (iOS/Android/web), Capacitor permet de déployer en natif depuis un seul codebase.

### Mobile / tablet first

Chaque vue est conçue pour fonctionner sur téléphone et tablette en priorité, puis sur écran PC. Les frames Figma utilisent l'auto-layout pour garantir ce comportement responsive.

### Plan de salle : canvas libre avec Konva.js

**Décision :** éditeur de plan de salle avec Konva.js (canvas 2D) — pas de grille fixe.

- Tables : formes rondes et carrées/rectangulaires, drag & drop, rotation, redimensionnement libres
- Zones : polygones libres dessinés point par point, stockés en JSON en base
- Configuration du plan : MANAGER uniquement
- Consultation : SERVEUR en lecture seule (clic table → prise de commande)
- Synchronisation temps réel WebSocket pour tous les rôles

**Pourquoi :** la géographie d'un bar ne rentre pas dans une grille fixe. Konva.js est la bibliothèque de référence pour ce type de canvas interactif dans l'écosystème Angular.

### QR code : TableSession non authentifiée

Chaque table a un QR code permanent lié à `table.id`. Le scan génère une `TableSession` avec token temporaire. L'interface client est non authentifiée, ultra-légère, indépendante du bundle staff. Paiement : directement via l'interface ou validation manuelle par le personnel (terminal/liquide).

### Internationalisation (i18n)

L'application doit être internalisée dès le départ — les bars ne sont pas forcément en France. Utilisation d'un système i18n Angular compatible Ionic.

### Multi-tenant : architecture prête, instance unique pour l'instant

L'architecture est conçue pour permettre une migration multi-tenant ultérieure sans l'implémenter maintenant (une seule instance au démarrage).

### Composition en cascade dans Figma

Tous les composants Figma sont construits selon le principe de composition en cascade (identique à Angular/React). Un composant parent n'utilise que des instances de composants enfants.

**Pourquoi :** cohérence du design system, modifications globales propagées automatiquement, alignement avec la structure de code Angular/Ionic.

### Thème dark avec palette fixe

Thème sombre par défaut, mode clair accessible. Palette définie dans les tokens CSS.

**Pourquoi :** application en conditions de bar (luminosité faible). Le dark mode est le mode principal.

### NavBar verticale — sidebar gauche (220px, desktop) / bottom nav (mobile)

Navigation en sidebar gauche sur desktop/tablette large. En mobile, à adapter en bottom navigation (pattern Ionic standard).

**Pourquoi :** le contenu principal (kanban, plan de salle) nécessite la pleine largeur horizontale sur grand écran ; la bottom nav est le pattern UX natif sur mobile.

### NgRx limité à l'auth

NgRx uniquement pour l'authentification. Le reste est géré en services Angular directs.

**Pourquoi :** éviter la complexité NgRx sur des données déjà synchronisées via WebSocket.

### WebSocket STOMP — 4 topics fixes

Architecture validée : `/topic/commandes`, `/topic/commandes/{id}`, `/topic/tables`, `/topic/stock/alerte`.

### TableNode comme composant Figma

Les tables sont représentées par le composant `TableNode` (12 variants : Round/Square × 6 statuts), positionné librement sur le canvas Figma. Les zones sont des frames de délimitation.

---

## 12. Prochaine session

### Figma — éléments restants

- **Vue Serveur** : page entièrement vide à créer (prise de commande, suivi état)
- **Fusion — Résultat** : `T4 (fusionnée)` et `T6 (fusionnée)` sont des `RECTANGLE`/`ELLIPSE` bruts → remplacer par des `TableNode` instances avec un variant "fusionné"
- **Barman — Stocks** : le frame `Statut` dans le Side Panel T4 est vide après nettoyage → ajouter une instance `StatusBadge`
- **Dashboard manager** : aucun écran designé → à créer from scratch (stats temps réel)
- **Vue Barman** : 5 nouveaux écrans créés (Liste Cocktails, Détail, Création, Gestion Ingrédients, Vue Globale Stock) — à componentiser avec le pattern cascade DS

### Backend — priorités code

- 🐛 **BUG** : corriger `dateLivraison` dans `CommandeService` (set sur `PRET` → doit être `LIVREE`)
- 🔐 Externaliser le secret JWT (`application.yml` → variable d'environnement)
- 🧪 Ajouter tests unitaires sur `CommandeService` (cycle de vie commande)
- 📦 Implémenter le déstockage auto : hook dans `changerStatut()` sur `EN_PREPARATION`

### Frontend — priorités

- Compléter les abonnements WebSocket dans `websocket.service.ts`
- Créer le module Facturation (API backend prête, UI manquante)
- Connecter les guards de rôle aux routes de Vue Serveur

### Rappels plugin Figma

> **CRITIQUE** : toujours appeler `await figma.setCurrentPageAsync(page)` AVANT de lire `page.children`.
> Utiliser `figma.getNodeById(id)` pour éviter les références stales entre scripts.
> Snapshot avant boucle : `const snap = [...node.children]` puis utiliser les IDs.
