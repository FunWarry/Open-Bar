# OpenBar — État des Features & Roadmap

> Dernière mise à jour : 29 juillet 2026 — PR #202 / Ticket #200 (Refactor UI complet Figma & Vue Client QR Code)

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
| Passage commande publique QR (#184) | ✅ | ✅ | ✅ | — |
| Déstockage auto (EN_PREPARATION & Variantes) | ✅ | — | ✅ | — |
| Alertes stock WebSocket | ✅ | ✅ | ✅ | — |
| Notifications WS (toasts + panneau navbar) | ✅ | ✅ | ✅ | — |
| Service Broadcast STOMP (#187) | ✅ | — | ✅ | — |
| Notifications Sonores & Visuelles (#181) | ✅ | ✅ | ✅ | Synthétiseur Web Audio API & Badges |
| Configuration Seuils Alertes Commandes & Stock (#197) | ✅ | ✅ | ✅ | Réglages Manager et Barman |
| Factures (liste + détail + règlement) | ✅ | ✅ | ✅ | — |
| Fusion d'additions (#186) | ✅ | ❌ | ✅ | Frontend manquant |
| Export factures (PDF) | ✅ | ✅ | ✅ | OpenPDF A4 conforme mentions légales |
| Division d'addition (split égal/par sélection) | ✅ | ✅ | ✅ | — |
| Dashboard Manager / stats | ✅ | ✅ polling 30s | ✅ | — |
| Dashboard Barman | ✅ | ✅ kanban temps réel | ✅ | — |
| Vue Serveur (plan de salle + variantes modal #182) | ✅ | ✅ | ✅ | — |
| Plan de salle interactif (Konva.js) | ✅ | ✅ | ✅ | — |
| Vue Client QR Code (passage commande + suivi STOMP) | ✅ | ✅ | ✅ | Vue Client mobile complète (`/client/commande`, `/client/suivi/:id`) |

## Features Manquantes Prioritaires (Frontend)

1. **#193 - [Backend/Frontend] Tests d'intégration Spring Boot (Testcontainers) et E2E Playwright**

## Dette Technique Active

| # | Description | Statut |
|---|-------------|--------|
| 1 | `allow-circular-references: true` Spring | ⚠️ À corriger |
| 2 | Bug `dateLivraison` set sur `PRET` au lieu de `LIVREE` | ⚠️ Bug connu |
| 3 | 13 CVEs devDeps Angular (esbuild, babel, vite) | ⚠️ Angular 22 requis |

## Historique Résolutions

| PR / Issue | Description |
|------------|-------------|
| #202 (#120/#200) | Vue Client QR Code (#120) & Refactoring UI complet Figma (#200) : Setup, Auth, Profile, Error 404, Dashboard Barman et Vue Client QR Code (passage commande public + suivi STOMP temps réel) |
| #201 (#200) | Refactor UI complet Figma : tokens CSS (variables.css / styles.css), ActionButton (variantes edit/mark), UserAvatar (role color), Navbar/Header/CocktailList migration @if/@for et a11y keyboard listeners |
| #199 (#180) | Impression Ticket de caisse 80mm & Rendu PDF A4 : TicketReceiptComponent thermique avec `@media print`, en-tête légal (SIRET, RCS, N° TVA, capital), ventilation TVA multi-taux et mentions légales de paiement |
| #198 (#129-#134) | Facturation Légale NF525 / CGI Art. 289 : Données établissement (SIRET/TVA/RCS), TVA multi-taux (20%/10%/5.5%), numérotation séquentielle, avoirs, archivage 10 ans SHA-256, export CSV & déclaration mensuelle CA3 + composant Admin Établissement |
| #197 | Configuration des Seuils d'Alerte Temporels des Commandes & Stock Ingrédients (Manager & Barman) |
| Fix IDE | Nettoyage des avertissements linter IDE (AppSettings @Column/ZoneId, ingredient-list Transloco & @if/@for control flow) |
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
