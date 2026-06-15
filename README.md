# OpenBar

Application de gestion de bar en temps réel : prise de commandes (serveurs), préparation (barmans), supervision (managers).

Communication temps réel entre tous les acteurs via WebSocket STOMP — du ticket de commande à la facture.

[![Kanban](https://img.shields.io/badge/GitHub-Kanban-blue)](https://github.com/users/FunWarry/projects/3/views/1)
[![Figma](https://img.shields.io/badge/Figma-Design%20System-purple)](https://www.figma.com/design/XSVwFk64kgtqgUN9n5qoMw)

---

## Stack

| Couche | Technologie | Version |
|--------|-------------|---------|
| Backend | Spring Boot | 3.3.3 |
| Runtime | Java | 22 |
| Base de données | PostgreSQL | — |
| Sécurité | Spring Security + JWT | JJWT 0.11.5 |
| Temps réel | WebSocket STOMP | via Spring |
| Frontend | Angular | 19 |
| UI | Ionic | 8+ |
| State | NgRx | 19 |

---

## Lancer le projet

**Prérequis** : Java 22, Maven, Node.js 20+, Docker

```bash
# 1. Base de données
cd backend/src/main/resources
docker compose up -d

# 2. Backend  →  http://localhost:8080
cd backend
mvn spring-boot:run

# 3. Frontend  →  http://localhost:4200
cd frontend
npm install
ng serve
```

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

> Légende : ✅ complet · 🔄 squelette / en cours · ❌ manquant

| Feature | Backend | Frontend |
|---------|---------|----------|
| Auth JWT | ✅ | ✅ |
| Routing + guards + lazy loading | ✅ | ✅ |
| Gestion utilisateurs (admin) | ✅ | ✅ |
| Cocktails CRUD | ✅ | 🔄 squelette |
| Ingrédients CRUD | ✅ | 🔄 squelette |
| Tables | ✅ | 🔄 squelette |
| Commandes (kanban barman) | ✅ | 🔄 squelette |
| Plan de salle (manager) | ✅ | 🔄 squelette |
| Services HTTP (cocktails/commandes/tables…) | ✅ | ❌ |
| WebSocketService | ✅ | ❌ vide |
| Notifications temps réel | ✅ | ❌ |
| Vue Serveur | ✅ | ❌ |
| Factures | ✅ | ❌ |
| Déstockage automatique | ❌ | — |
| Plan de salle interactif (Konva.js) | ❌ | ❌ |
| Dashboard / statistiques | ❌ | ❌ |
| QR code commande client | ❌ | ❌ |

---

## Documentation

- **[CDC.md](CDC.md)** — cahier des charges complet (stack, modèle de données, design system, roadmap)
- **[docs/](docs)** — rapports de sessions et analyses
- **[Kanban GitHub](https://github.com/users/FunWarry/projects/3/views/1)** — 75 issues (54 dev + 21 design)
- **[Design System Figma](https://www.figma.com/design/XSVwFk64kgtqgUN9n5qoMw)** — 6 pages, 60+ composants

---

## Contribuer

Toute contribution doit être liée à une issue GitHub — voir le [kanban](https://github.com/users/FunWarry/projects/3/views/1).
