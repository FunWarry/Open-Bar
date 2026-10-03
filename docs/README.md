# 📚 OpenBar — Documentation & Guides

Bienvenue dans l'espace documentaire d'**OpenBar**.  
Ce répertoire regroupe les guides techniques, l'historique des sessions d'architecture et les spécifications du système.

---

## 🧭 Cartographie Documentaire

| Document | Emplacement | Public & Rôle |
|----------|-------------|---------------|
| **Présentation Globale** | [`README.md`](../README.md) | Showcase produit, modules, fonctionnalités clés, démarrage rapide |
| **Cahier des Charges (CDC)** | [`CDC.md`](../CDC.md) | Spécifications fonctionnelles complètes, matrice des fonctionnalités, modèle de données |
| **Guide Technique & Architecture** | [`docs/TECHNICAL_GUIDE.md`](TECHNICAL_GUIDE.md) | Architecture logicielle, protocoles réseau (Concert IP, ESC/POS), STOMP, conformité fiscale |
| **Guide Frontend** | [`frontend/README.md`](../frontend/README.md) | Architecture Angular 22 / Ionic 9, signaux, design tokens, tests Karma & Playwright |
| **Guide Backend** | [`backend/README.md`](../backend/README.md) | Architecture Spring Boot 4.1.1, modèle relationnel, DTOs immuables, sécurité JWT |
| **Instructions Claude / Agent** | [`CLAUDE.md`](../CLAUDE.md) | Règles de développement, conventions, checklists et commandes optimisées RTK |
| **Règles AI Agents** | [`.agents/AGENTS.md`](../.agents/AGENTS.md) | Règles absolues de qualité (zéro problème IDE, parité i18n, conventions) |

---

## 🗂️ Structure du Dossier `docs/`

```
docs/
├── README.md               # Le présent fichier d'index
├── TECHNICAL_GUIDE.md      # Guide d'architecture et d'ingénierie système détaillé
└── sessions/               # Traces des sessions de travail et décisions d'architecture
    ├── 2026-06-15-critique-projet.md
    └── 2026-06-22-sprint-tests-securite.md
```

---

## 📜 Historique des Sessions Majeures

| Date | Fichier | Sujet Traité |
|------|---------|--------------|
| 2026-06-15 | [`critique-projet.md`](sessions/2026-06-15-critique-projet.md) | Critique globale du projet (CDC, architecture, sécurité, dette) |
| 2026-06-22 | [`sprint-tests-securite.md`](sessions/2026-06-22-sprint-tests-securite.md) | Sprint : refresh token JWT (PR #100), export PDF (PR #101), saisonnalité (PR #102), couverture tests (PR #103) |
| 2026-10-03 | — | Sortie v0.8.0 : Bar Tabs (#538/#539), Monétique TPE Concert IP (:8888), Inventaire physique, Refonte documentaire promotionnelle |
