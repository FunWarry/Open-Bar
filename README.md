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

> Dernière mise à jour : 2 août 2026 — PR #224 : Alignement Figma Tables UI & Audit complet 8 pages Figma (Roadmap 18 tickets)
> Légende : ✅ complet · 🔄 en cours · ❌ manquant · — non applicable

| Feature | Backend | Frontend | Tests |
|---------|---------|----------|-------|
| Auth JWT + Refresh token | ✅ | ✅ | ✅ |
| Routing + guards + lazy loading | ✅ | ✅ | ✅ |
| Gestion utilisateurs (admin) | ✅ | ✅ | ✅ |
| Cocktails CRUD + saisonnalité | ✅ | ✅ | ✅ |
| Variantes cocktails & Déduction auto stocks | ✅ | ✅ | ✅ |
| Ingrédients CRUD & Routage (/ingredients) | ✅ | ✅ | ✅ |
| Tables CRUD & Alignement Figma (#224) | ✅ | ✅ | ✅ |
| Commandes (liste + détail + kanban barman) | ✅ | ✅ | ✅ |
| Transfert commande entre tables (#205/#207) | ✅ | ✅ | ✅ |
| Passage commande publique QR Code (#184) | ✅ | ✅ | ✅ |
| Vue Client QR Code (passage + suivi STOMP) | ✅ | ✅ | ✅ |
| Factures (liste + détail + split + règlement) | ✅ | ✅ | ✅ |
| Conformité Légale & Facturation (SIRET/TVA/RCS/SHA-256) | ✅ | ✅ | ✅ |
| Fusion d'additions | ✅ | ✅ | ✅ |
| Export PDF factures (OpenPDF A4) | ✅ | ✅ | ✅ |
| Division d'addition (split égal + par article) | ✅ | ✅ | ✅ |
| Dashboard Manager / statistiques | ✅ | ✅ | ✅ |
| Dashboard Barman (kanban temps réel) | ✅ | ✅ | ✅ |
| Vue Serveur (plan de salle + commandes) | ✅ | ✅ | ✅ |
| Plan de salle interactif & Gestion des Étages (#223) | ✅ | ✅ | ✅ |
| WebSocket STOMP + Notifications | ✅ | ✅ | ✅ |
| Alertes stock (bannière barman) | ✅ | ✅ | ✅ |
| Fuseau horaire paramétrable (TimeService) | ✅ | ✅ | ✅ |
| Journal d'audit système (/api/audit-logs) (#206) | ✅ | ✅ | ✅ |
| Layout Global TopBar / NavBar Figma (#208–#211) | — | ✅ | ✅ |
| Personnalisation Thème & Palettes HSL (#217) | — | ✅ | ✅ |
| Documentation OpenAPI / Swagger UI | ✅ | — | ✅ |
| JavaDoc & TSDoc | ✅ | ✅ | ✅ |

### 🎯 Roadmap des Tickets Restants (Audit Figma 8 pages)

- 🔴 **Haute Priorité** : Scanner QR Client (#A), Vue Globale Stock Barman (#B), Récap Journée Facturation (#C), Règlement Individuel Post-Split (#D), Onboarding flow 1ère connexion (#E), Composant EmptyState réutilisable (#F)
- 🟡 **Moyenne Priorité** : Vue Grille Ingrédients (#G), Pagination/Shifts Employés (#H), EDT Planning Backend (#I), Profil Préférences toggle son (#J), Champ pourboire règlement (#K), Mobile Bottom Nav Serveur (#L)
- 🟢 **Basse Priorité** : Fix dateLivraison (#M), Refactor circular refs (#N), Exceptions métier (#O), Ticket 58mm (#P), Panel stock alignement (#Q), Formulaire profil pré-rempli NgRx (#R)

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
