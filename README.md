# OpenBar

Application de gestion de bar en temps réel : prise de commandes (serveurs), préparation (barmans), supervision (managers).

Communication temps réel entre tous les acteurs via WebSocket STOMP — du ticket de commande à la facture.

[![CI](https://github.com/FunWarry/Open-Bar/actions/workflows/ci.yml/badge.svg)](https://github.com/FunWarry/Open-Bar/actions/workflows/ci.yml)
[![SonarCloud Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=FunWarry_Open-Bar&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=FunWarry_Open-Bar)
[![Kanban](https://img.shields.io/badge/GitHub-Kanban-blue)](https://github.com/users/FunWarry/projects/3/views/1)
[![Figma](https://img.shields.io/badge/Figma-Design%20System-purple)](https://www.figma.com/design/XSVwFk64kgtqgUN9n5qoMw)
[![Swagger UI](https://img.shields.io/badge/OpenAPI-Swagger--UI-green)](http://localhost:8080/swagger-ui.html)

---

## Stack

| Couche | Technologie | Version |
|--------|-------------|---------|
| Backend | Spring Boot | **4.0.6** |
| Runtime | Java | 22 (⚠️ épinglé — JDK 23+ incompatible Lombok) |
| Documentation API | Springdoc OpenAPI | 2.8.9 |
| Base de données | PostgreSQL | — |
| Sécurité | Spring Security + JWT | JJWT 0.12.6 |
| Temps réel | WebSocket STOMP | via Spring |
| PDF | OpenPDF | 2.0.3 |
| Frontend | Angular | 20 |
| UI | Ionic | 8.8.11 |
| State | NgRx | 20 (auth uniquement) |

---

## Lancer le projet

**Prérequis** : Java 22 (exactement), Maven, Node.js 22+, Docker, `JWT_SECRET` env var (≥ 32 chars)

```bash
# 1. Base de données
cd backend/src/main/resources
docker compose up -d

# 2. Backend  →  http://localhost:8080
export JWT_SECRET=$(openssl rand -base64 32)  # ou définir dans backend/.env
cd backend
mvn spring-boot:run
# Swagger UI interactive : http://localhost:8080/swagger-ui.html

# 3. Frontend  →  http://localhost:4200
cd frontend
npm install
ng serve
```

---

## Sauvegardes & Restauration de la Base de Données

Pour protéger les données métier (commandes, stocks, catalogue, factures, logs d'audit) sur machine locale ou serveur embarqué (Raspberry Pi 5 / mini-PC) :

### 1. Sauvegarde Automatique & Rétention (Docker Compose Production)
Le conteneur `backup` (`docker-compose.prod.yml`) gère automatiquement les snapshots de la base de données :
- **Fréquence** : Quotidienne à 03:00 (cron `0 3 * * *`, configurable via `BACKUP_SCHEDULE`)
- **Format** : Archive compressée gzip (`.sql.gz`)
- **Politique de rétention** : 7 jours glissants, 4 sauvegardes hebdomadaires, 6 sauvegardes mensuelles
- **Stockage** : Volume Docker persistant `openbar_backups`

### 2. Sauvegarde Manuelle à la Demande
```bash
# Générer un snapshot instantané (.sql.gz)
./scripts/backup-db.sh

# Sous Windows PowerShell :
.\scripts\backup-db.ps1
```

### 3. Restauration / Disaster Recovery
```bash
# Restaurer un snapshot avec vérifications préalables et backup de sécurité automatique
./scripts/restore-db.sh -f ./backups/openbar_backup_YYYY-MM-DD_HHMMSS.sql.gz

# Sous Windows PowerShell :
.\scripts\restore-db.ps1 -File .\backups\openbar_backup_YYYY-MM-DD_HHMMSS.sql.gz
```

---

## Documentation du code & API

Toute modification du codebase doit respecter les règles de documentation suivantes :

- **Documentation API REST (OpenAPI / Swagger UI)** :
  - Accessible localement sur [`http://localhost:8080/swagger-ui.html`](http://localhost:8080/swagger-ui.html)
  - Tout nouveau controller REST doit porter l'annotation `@Tag` et ses méthodes documentées avec `@Operation` et `@ApiResponse`.
- **JavaDoc (Backend Spring Boot)** :
  - **Obligatoire** sur tous les services métier (`com.bar.gestioncocktail.service.*`), DTOs (`record`), exceptions et classes de configuration.
- **TSDoc (Frontend Angular 20)** :
  - **Obligatoire** sur tous les services Angular (`core/services/*`), les guards, interceptors et le store NgRx auth (`actions`, `reducers`, `selectors`, `effects`).
- **Knowledge Base IA & Projet** :
  - Le répertoire `.agents/knowledge/` contient la documentation synchronisée de l'architecture, du modèle de données et des conventions.

---

## Rôles

| Rôle | Interface | Accès |
|------|-----------|-------|
| `SERVEUR` | Plan de salle, prise de commande | Tables, commandes |
| `BARMAN` | Kanban, stocks, cocktails | Préparation, stocks |
| `MANAGER` | Plan de salle, stats, facturation | Supervision complète |
| `ADMIN` | Gestion utilisateurs | Maintenance technique |

Après login, redirection directe vers la vue du rôle — pas d'écran intermédiaire.

---

## Cycle d'une commande

```
EN_ATTENTE → EN_PREPARATION → PRET → LIVREE → REGLEE
                                           ↘ ANNULEE
```

---

## État d'implémentation

> Dernière mise à jour : 15 août 2026 — PR #298 (#292) : Refonte complète du tableau de bord comptoir barman (/barman), Kanban STOMP, timers précis et alertes d'urgence Web Audio API, fiches recettes dépliables, ruptures à chaud, impression tickets 80mm, 100% CI passée
> Légende : ✅ complet · 🔄 en cours · ❌ manquant · — non applicable

| Feature | Backend | Frontend | Tests |
|---------|---------|----------|-------|
| Auth JWT + Refresh token | ✅ | ✅ | ✅ |
| Routing + guards + lazy loading | ✅ | ✅ | ✅ |
| Gestion utilisateurs (admin) | ✅ | ✅ | ✅ |
| Cocktails CRUD + saisonnalité | ✅ | ✅ | ✅ |
| Vue Grille Cocktails & Verres 3D (#242) | ✅ | ✅ | ✅ |
| Filtrage Cocktails par Allergène (#243) | — | ✅ | ✅ |
| Variantes cocktails & Déduction auto stocks | ✅ | ✅ | ✅ |
| Ingrédients CRUD & Routage (/ingredients) | ✅ | ✅ | ✅ |
| Vue Barman Ingrédients Mode Grille (#231) | — | ✅ | ✅ |
| Tables CRUD & Alignement Figma (#224) | ✅ | ✅ | ✅ |
| Commandes (liste + détail + kanban barman) | ✅ | ✅ | ✅ |
| Transfert commande entre tables (#205/#207) | ✅ | ✅ | ✅ |
| Passage commande publique QR Code (#184) | ✅ | ✅ | ✅ |
| Vue Client QR Code (passage + suivi STOMP) | ✅ | ✅ | ✅ |
| Scanner QR Code Client (Figma 636:988) (#225) | — | ✅ | ✅ |
| Factures (liste + détail + split + règlement) | ✅ | ✅ | ✅ |
| Facturation Vue Récap Journée & Z-Report PDF (#227) | ✅ | ✅ | ✅ |
| Facturation Vue Règlement Post-Split (#228) | ✅ | ✅ | ✅ |
| Facturation Champ Pourboire (#235) | ✅ | ✅ | ✅ |
| Conformité Légale & Facturation (SIRET/TVA/RCS/SHA-256) | ✅ | ✅ | ✅ |
| Fusion d'additions | ✅ | ✅ | ✅ |
| Export PDF factures (OpenPDF A4) | ✅ | ✅ | ✅ |
| Division d'addition (split égal + par article) | ✅ | ✅ | ✅ |
| Dashboard Manager / statistiques | ✅ | ✅ | ✅ |
| Manager Shifts Employés & Pagination (#232) | ✅ | ✅ | ✅ |
| Manager Planning Hebdomadaire Complexe (#233) | ✅ | ✅ | ✅ |
| Dashboard Barman Moderne, Fiches Recettes & Ruptures à Chaud (#292) | ✅ | ✅ | ✅ |
| Vue Serveur (plan de salle 2D Konva + prise de commande + kanban) (#290/#297) | ✅ | ✅ | ✅ |
| Vue Serveur Mobile (Bottom Navigation & MobileTableCard) (#236) | — | ✅ | ✅ |
| Plan de salle interactif Konva.js, Snap 50cm & Magnétisme (#291/#297) | ✅ | ✅ | ✅ |
| Écran Onboarding Flow par Rôle (#229) | — | ✅ | ✅ |
| Composant EmptyState Réutilisable (#230) | — | ✅ | ✅ |
| Profil Section Préférences & Notifications (#234) | — | ✅ | ✅ |
| WebSocket STOMP + Notifications | ✅ | ✅ | ✅ |
| Alertes stock (bannière barman) | ✅ | ✅ | ✅ |
| Vue Globale Stock Barman & Manager (#226) | ✅ | ✅ | ✅ |
| Fuseau horaire paramétrable (TimeService) | ✅ | ✅ | ✅ |
| Journal d'audit système (/api/audit-logs) (#206) | ✅ | ✅ | ✅ |
| Layout Global TopBar / NavBar Figma (#208–#211) | — | ✅ | ✅ |
| Personnalisation Thème & Palettes HSL (#217) | — | ✅ | ✅ |
| Documentation OpenAPI / Swagger UI | ✅ | — | ✅ |
| JavaDoc & TSDoc (100% en anglais) | ✅ | ✅ | ✅ |
| Sauvegardes PostgreSQL & Rétention Auto (#337) | ✅ | — | ✅ |

### 🎯 Roadmap des Tickets Restants (Audit Figma 8 pages)

- 🔴 **Haute Priorité** : ~~Scanner QR Client (#225)~~ ✅, ~~Vue Globale Stock Barman (#226)~~ ✅, ~~Récap Journée Facturation (#227)~~ ✅, ~~Règlement Individuel Post-Split (#228)~~ ✅, ~~Onboarding flow 1ère connexion (#229)~~ ✅, ~~Composant EmptyState réutilisable (#230)~~ ✅
- 🟡 **Moyenne Priorité** : ~~Vue Grille Ingrédients (#231)~~ ✅, ~~Pagination/Shifts Employés (#232)~~ ✅, ~~EDT Planning Backend (#233)~~ ✅, ~~Profil Préférences toggle son (#234)~~ ✅, ~~Champ pourboire règlement (#235)~~ ✅, ~~Mobile Bottom Nav Serveur (#236)~~ ✅
- 🟢 **Basse Priorité / Technique** : ~~Fix dateLivraison (#224)~~ ✅, ~~Refactor circular refs (#224)~~ ✅, ~~Exceptions métier (#224)~~ ✅, ~~Ticket 58mm (#237)~~ ✅, ~~Panel stock alignement (#248)~~ ✅, ~~Formulaire profil pré-rempli NgRx (#247)~~ ✅, **Tests E2E & Intégration (#193)** [OPEN]

---

## Documentation projet

- **[Swagger UI API REST](http://localhost:8080/swagger-ui.html)** — Interface interactive OpenAPI
- **[CDC.md](CDC.md)** — cahier des charges complet (stack, modèle de données, design system, roadmap)
- **[CLAUDE.md](CLAUDE.md)** — contexte agent IA : conventions, features, workflow dev
- **[Kanban GitHub](https://github.com/users/FunWarry/projects/3/views/1)** — issues actives
- **[Design System Figma](https://www.figma.com/design/XSVwFk64kgtqgUN9n5qoMw)** — 8 pages, 60+ composants

---

## Contribuer

Toute contribution doit être liée à une issue GitHub — voir le [kanban](https://github.com/users/FunWarry/projects/3/views/1).
Chaque contribution de code doit s'accompagner de sa documentation JavaDoc / TSDoc.
