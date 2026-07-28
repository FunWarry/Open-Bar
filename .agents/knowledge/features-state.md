# OpenBar — État des Features & Roadmap

> Dernière mise à jour : 28 juillet 2026 — PRs #184, #185, #186, #187

## Tableau des Features

| Feature | Backend | Frontend | Tests | Notes |
|---------|---------|----------|-------|-------|
| Auth JWT | ✅ | ✅ | ✅ | — |
| Configuration initiale (/setup admin) | ✅ | ✅ | ✅ | — |
| Bibliothèque composants UI Figma | — | ✅ | ✅ | — |
| Écrans communs (Login, Register, Profile, 404, Loading) | — | ✅ | ✅ | — |
| Écrans Vue Barman (kanban, badges, action buttons) | — | ✅ | ✅ | — |
| Refresh token JWT | ✅ | ✅ | ✅ | Rotation + interceptor |
| Gestion users (admin) | ✅ | ✅ | ✅ | — |
| Rôles ADMIN/MANAGER/SERVEUR/BARMAN | ✅ | ✅ | ✅ | — |
| DTOs de sortie (tous controllers) | ✅ | — | ✅ | Java records `from(entity)` |
| GlobalExceptionHandler | ✅ | — | ✅ | — |
| Error interceptor frontend | — | ✅ | ✅ | — |
| Cocktails CRUD | ✅ | ✅ | ✅ | — |
| Saisonnalité cocktails | ✅ | ✅ | ✅ | — |
| Variantes & Déduction auto stocks (#185) | ✅ | ❌ | ✅ | Frontend manquant |
| Ingrédients CRUD | ✅ | ✅ | ✅ | — |
| Tables CRUD | ✅ | ✅ | ✅ | — |
| Transfert commande entre tables (#186) | ✅ | ❌ | ✅ | Frontend manquant |
| Commandes | ✅ | ✅ | ✅ | — |
| Passage commande publique QR (#184) | ✅ | ❌ | ✅ | Vue Client frontend manquante |
| Déstockage auto (EN_PREPARATION & Variantes) | ✅ | — | ✅ | — |
| Alertes stock WebSocket | ✅ | ✅ | ✅ | — |
| Notifications WS (toasts + panneau navbar) | ✅ | ✅ | ✅ | — |
| Service Broadcast STOMP (#187) | ✅ | — | ✅ | — |
| Factures (liste + détail + règlement) | ✅ | ✅ | ✅ | — |
| Fusion d'additions (#186) | ✅ | ❌ | ✅ | Frontend manquant |
| Export factures (PDF) | ✅ | ✅ | ✅ | OpenPDF |
| Division d'addition (split égal/par sélection) | ✅ | ✅ | ✅ | — |
| Dashboard Manager / stats | ✅ | ✅ polling 30s | ✅ | — |
| Dashboard Barman | ✅ | ✅ kanban temps réel | ✅ | — |
| Vue Serveur (plan de salle + commandes) | ✅ | ✅ | ✅ | — |
| Plan de salle interactif (Konva.js) | ✅ | ✅ | ✅ | — |
| Vue Client QR Code (passage commande + suivi STOMP) | ✅ | ❌ | ✅ | **Frontend à implémenter** |

## Features Manquantes Prioritaires (Frontend)

1. **Vue Client QR Code** — interface publique non-authentifiée pour le client
2. **Variantes & Déduction auto stocks** — UI côté barman
3. **Fusion d'additions** — UI manager
4. **Transfert commande entre tables** — UI serveur

## Dette Technique Active

| # | Description | Statut |
|---|-------------|--------|
| 1 | `allow-circular-references: true` Spring | ⚠️ À corriger |
| 2 | Bug `dateLivraison` set sur `PRET` au lieu de `LIVREE` | ⚠️ Bug connu |
| 3 | 13 CVEs devDeps Angular (esbuild, babel, vite) | ⚠️ Angular 22 requis |
| 4 | Exceptions `RuntimeException` génériques dans certains services | ⚠️ Partiellement corrigé |

## Historique Résolutions

| PR | Feature résolue |
|----|----------------|
| #83 | DTOs de sortie Java records |
| #85 | Typo BARMEN → BARMAN |
| #100 | Refresh token + rotation |
| #103 | 53 specs Angular + 12 tests Java |
| #145 | LCOV frontend + SonarCloud fix |
| #149 | JWT_SECRET externalisé + validation fail-fast |
| #173 | i18n Transloco (fr/en) |
| #184 | QR Code commande publique (backend) |
| #185 | Variantes & Déduction auto stocks |
| #186 | Transfert table & Fusion factures |
| #187 | Service Broadcast STOMP |
