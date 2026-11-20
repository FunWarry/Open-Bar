# 📚 OpenBar — Documentation & Guides

Bienvenue dans l'espace documentaire officiel d'**OpenBar**.  
Ce répertoire regroupe les spécifications fonctionnelles, les guides d'architecture logicielle, les manuels d'exploitation système et les politiques de journalisation.

---

## 🧭 Cartographie Documentaire

| Document | Emplacement | Public & Rôle |
|----------|-------------|---------------|
| **Présentation Globale** | [`README.md`](../README.md) | Showcase produit, modules, fonctionnalités clés, démarrage rapide en 60s |
| **Cahier des Charges (CDC)** | [`docs/CDC.md`](CDC.md) | Spécifications fonctionnelles complètes, matrice des 10 modules, modèle de données |
| **Guide Technique & Architecture** | [`docs/TECHNICAL_GUIDE.md`](TECHNICAL_GUIDE.md) | Architecture logicielle, protocoles réseau (Concert IP, ESC/POS), STOMP, conformité fiscale |
| **Guide Journalisation & Logs** | [`docs/LOGS_GUIDE.md`](LOGS_GUIDE.md) | Architecture centralisée des logs, conteneur Logrotate RPi 5, accès temps réel & dépannage |
| **Guide Frontend** | [`frontend/README.md`](../frontend/README.md) | Architecture Angular 22 / Ionic 9, signaux, design tokens, tests Karma & Playwright |
| **Guide Backend** | [`backend/README.md`](../backend/README.md) | Architecture Spring Boot 4.2.0, modèle relationnel, DTOs immuables, sécurité JWT |
| **Conditions Générales (CGU)** | [`TERMS_OF_SERVICE.md`](../TERMS_OF_SERVICE.md) | Conditions d'utilisation, conformité légale & RGPD / données locales |
| **Licence Logicielle** | [`LICENSE.md`](../LICENSE.md) | Licence Propriétaire Commerciale OpenBar |
| **Guide Développeur Interne** | [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Règles de développement, conventions de commit et standards internes |
| **Règles AI Agents** | [`.agents/AGENTS.md`](../.agents/AGENTS.md) | Règles absolues de qualité (zéro problème IDE, parité i18n, conventions) |
| **État des Fonctionnalités** | [`.agents/knowledge/features-state.md`](../.agents/knowledge/features-state.md) | Matrice exhaustive des features, tests et couverture métier |

---

## 🗂️ Structure du Dossier `docs/`

```
docs/
├── README.md               # Le présent fichier d'index documentaire
├── CDC.md                  # Cahier des charges fonctionnel, matrice des modules & roadmap
├── TECHNICAL_GUIDE.md      # Guide d'architecture, protocoles réseau (TPE, ESC/POS) & exploitation
└── LOGS_GUIDE.md           # Architecture des logs, conteneur Logrotate & rotation en production
```

---

## 🎯 Ressources Externes Clés

- **Dépôt GitHub** : [https://github.com/FunWarry/Open-Bar](https://github.com/FunWarry/Open-Bar)
- **Kanban & Roadmap** : [GitHub Projects OpenBar](https://github.com/users/FunWarry/projects/3/views/1)
- **Design System Figma** : FileKey `XSVwFk64kgtqgUN9n5qoMw` (8 pages, 60+ composants atomiques)
- **Qualité & Couverture** : [SonarCloud OpenBar Dashboard](https://sonarcloud.io/summary/new_code?id=FunWarry_Open-Bar)
