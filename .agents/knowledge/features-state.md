# OpenBar — État des Features & Roadmap

> Dernière mise à jour : 29 juillet 2026 — PRs #184, #185, #186, #187, #194, #195, #196

## Tableau des Features

| Feature | Backend | Frontend | Tests | Notes |
|---------|---------|----------|-------|-------|
| Documentation complète & API OpenAPI/Swagger (#192/#194) | ✅ | ✅ | ✅ | JavaDoc, TSDoc, OpenAPI 3.0 |
| Quality Gate SonarCloud & Sécurité 100% sans `@SuppressWarnings` | ✅ | ✅ | ✅ | Coverage > 80%, Note A |
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
| Variantes & Déduction auto stocks (#185/#182) | ✅ | ✅ | ✅ | Modal sélection & personnalisation |
| Ingrédients CRUD | ✅ | ✅ | ✅ | — |
| Tables CRUD | ✅ | ✅ | ✅ | — |
| Transfert commande entre tables (#186) | ✅ | ❌ | ✅ | Frontend manquant |
| Commandes | ✅ | ✅ | ✅ | — |
| Passage commande publique QR (#184) | ✅ | ❌ | ✅ | Vue Client frontend manquante |
| Déstockage auto (EN_PREPARATION & Variantes) | ✅ | — | ✅ | — |
| Alertes stock WebSocket | ✅ | ✅ | ✅ | — |
| Notifications WS (toasts + panneau navbar) | ✅ | ✅ | ✅ | — |
| Service Broadcast STOMP (#187) | ✅ | — | ✅ | — |
| Notifications Sonores & Visuelles (#181) | ✅ | ✅ | ✅ | Synthétiseur Web Audio API & Badges |
| Factures (liste + détail + règlement) | ✅ | ✅ | ✅ | — |
| Fusion d'additions (#186) | ✅ | ❌ | ✅ | Frontend manquant |
| Export factures (PDF) | ✅ | ✅ | ✅ | OpenPDF |
| Division d'addition (split égal/par sélection) | ✅ | ✅ | ✅ | — |
| Dashboard Manager / stats | ✅ | ✅ polling 30s | ✅ | — |
| Dashboard Barman | ✅ | ✅ kanban temps réel | ✅ | — |
| Vue Serveur (plan de salle + variantes modal #182) | ✅ | ✅ | ✅ | — |
| Plan de salle interactif (Konva.js) | ✅ | ✅ | ✅ | — |
| Vue Client QR Code (passage commande + suivi STOMP) | ✅ | ❌ | ✅ | **Frontend à implémenter** |

## Features Manquantes Prioritaires (Frontend)

1. **#120 - [Frontend] Vue Client QR Code — Commande mobile sans authentification**
2. **#180 - [Frontend/Backend] Module d'impression Ticket de caisse 80mm & Rendu PDF A4 conforme Figma**
3. **#193 - [Backend/Frontend] Tests d'intégration Spring Boot (Testcontainers) et E2E Playwright**

## Dette Technique Active

| # | Description | Statut |
|---|-------------|--------|
| 1 | `allow-circular-references: true` Spring | ⚠️ À corriger |
| 2 | Bug `dateLivraison` set sur `PRET` au lieu de `LIVREE` | ⚠️ Bug connu |
| 3 | 13 CVEs devDeps Angular (esbuild, babel, vite) | ⚠️ Angular 22 requis |

## Historique Résolutions

| PR / Issue | Description |
|------------|-------------|
| #196 (#181) | Notifications Sonores et Visuelles Temps Réel — Alertes Barman et Serveur |
| #195 (#182) | Variantes & Options de Personnalisation de Cocktails dans la Prise de Commande Serveur |
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
| #194 | Documentation OpenAPI/Swagger, JavaDoc, TSDoc & SonarCloud Quality Gate (Security Rating A, Coverage >80%, 0 @SuppressWarnings) |
