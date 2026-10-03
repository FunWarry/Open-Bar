# 🍸 OpenBar — Frontend Application (PWA)

> **Client Web & Mobile PWA temps réel pour OpenBar**  
> Développé avec **Angular 22.2.0**, **Ionic 9.0.5**, **Transloco 8.4.0**, et **Konva.js 10.7.0**.

---

## 🌟 Vue d'ensemble

Le frontend d'OpenBar est une **Progressive Web App (PWA)** mobile-first et responsive conçue pour fonctionner avec une réactivité sub-50ms sur le réseau local Wi-Fi de l'établissement :
- **Prise de commande en salle** : Interface tactile optimisée pour serveurs avec plan de salle interactif Konva.js, gestion des ardoises (bar tabs) et encaissement TPE.
- **KDS Barman & Cuisine** : Kanban de préparation en temps réel via WebSocket STOMP, mode rush et recettes cocktails détaillées avec variantes.
- **Supervision & Gestion** : Dashboard manager avec KPI en direct, audit d'inventaire avec jauges de bouteilles, gestion des achats fournisseurs, tiroir-caisse et clôture fiscale Z-Report.
- **Commande Client QR Code** : Web-app éphémère sans installation pour commander et régler directement depuis un smartphone.
- **Affichage Déporté TV** : Vue spéciale `/roulette-display` pour animer la roulette mystery drink sur écran géant.

---

## 🏛️ Architecture & Choix Techniques

| Domaine | Technologie | Justification |
|---------|-------------|---------------|
| **Framework** | **Angular 22.2.0** | Composants standalone stricts, signaux réactifs (`Signals`), zoneless-ready, lazy-loading systématique. |
| **UI Kit** | **Ionic Framework 9.0.5** | Composants mobiles/tablettes optimisés pour l'ergonomie tactile au comptoir et en salle (Angular Material abandonné). |
| **Plan de Salle** | **Konva.js 10.7.0** | Rendu Canvas 2D ultra-fluide avec grille magnétique 50cm, rotation d'éléments et zoom dynamique. |
| **Internationalisation** | **Transloco 8.4.0** | Parité 100% FR/EN sur plus de 2 500 clés avec lazy-loading des dictionnaires de traduction par feature. |
| **Temps Réel** | **STOMP / SockJS** | Abonnements réactifs aux 11 topics WebSocket avec reconnexion automatique en arrière-plan. |
| **State Management** | **NgRx 22 + Signals** | NgRx dédié à l'authentification et aux profils ; les états métier sont gérés par des services réactifs basés sur les `Signals`. |
| **Stockage Hors-Ligne** | **IndexedDB (`idb` 8.0.3)** | Mise en file d'attente locale des commandes lors de coupures Wi-Fi et rejeu automatique à la reconnexion. |

---

## 📁 Structure du Projet

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/                      # Services transversaux, guards, interceptors
│   │   │   ├── components/ui/         # Composants UI partagés (search-bar, empty-state, modals...)
│   │   │   ├── guards/                # AuthGuard, RoleGuard, AdminGuard, ModuleGuard
│   │   │   ├── interceptors/          # AuthInterceptor, ErrorInterceptor
│   │   │   ├── models/                # Interfaces TypeScript & types stricts
│   │   │   ├── services/              # WebSocket, FeatureFlags, TPE, Sound, SessionTimeout...
│   │   │   └── store/                 # NgRx Auth State (actions, reducers, effects, selectors)
│   │   ├── features/                  # Modules applicatifs en lazy-loading
│   │   │   ├── auth/                  # Connexion, inscription, reset mot de passe
│   │   │   ├── bar-tabs/              # Gestion des ardoises comptoir sans table
│   │   │   ├── cocktails/             # Bibliothèque mixologie, variantes, roue des saveurs
│   │   │   ├── commandes/             # Prise de commande, sélection dynamique & modal ticket
│   │   │   ├── dashboard-barman/      # Kanban de préparation bar, alertes & rush mode
│   │   │   ├── dashboard-cuisine/     # KDS préparation cuisine
│   │   │   ├── dashboard-manager/     # Tableau de bord analytique, KPI & chiffre d'affaires
│   │   │   ├── dashboard-serveur/     # Vue salle, plan vectoriel & gestion des tables
│   │   │   ├── factures/              # Règlements, division (split), pourboire, TPE, Z-Report
│   │   │   ├── ingredients/           # Gestion des stocks, alertes & démarque
│   │   │   ├── inventory/             # Audit d'inventaire physique & jauges bouteilles
│   │   │   ├── purchases/             # Fournisseurs, commandes d'achat & réceptions BL
│   │   │   ├── qr-client/             # Expérience commande client sur smartphone
│   │   │   ├── roulette/              # Roulette Mystery Drink & /roulette-display TV
│   │   │   ├── setup/                 # Assistant d'initialisation de l'établissement
│   │   │   └── theme/                 # Personnalisation interactive des couleurs & palettes HSL
│   │   ├── app.component.ts           # Racine de l'application & conteneur Ionic
│   │   └── app.routes.ts              # Table de routage déclarative lazy-loadée
│   ├── assets/
│   │   └── i18n/                      # Fichiers de traduction Transloco (fr.json & en.json)
│   ├── test/                          # Pyramide de tests unitaires Karma (structure miroir)
│   └── theme/
│       └── variables.css              # Tokens CSS du Design System adaptatif (Light/Dark)
└── e2e/                               # Suites de tests de bout en bout Playwright
```

---

## 🎨 Design System Adaptatif

L'interface OpenBar repose sur un ensemble rigoureux de tokens CSS déclarés dans `src/theme/variables.css` :
- **Thème Adaptatif Sombre / Lumineux** : Prise en charge native du mode sombre pour les ambiances tamisées de bars de nuit et du mode lumineux pour les terrasses en plein soleil.
- **Règle Absolue Zéro Couleur en Dur** : Tout style SCSS / CSS doit obligatoirement utiliser les variables CSS :
  ```css
  /* ✅ Conforme */
  background: var(--background-surface-1);
  color: var(--text-primary);
  border: 1px solid var(--border-medium);
  box-shadow: var(--shadow-md);

  /* ❌ Strictement Interdit */
  background: #1e1e2d;
  color: white;
  border: 1px solid rgb(50, 50, 50);
  ```

---

## 🌐 Internationalisation (Transloco)

L'application garantit une parité stricte 1-pour-1 entre le Français (`fr`) et l'Anglais (`en`) :
- Toutes les chaînes visibles doivent utiliser le pipe Transloco :
  ```html
  <ion-button>{{ 'COMMANDE.ACTIONS.CONFIRMER' | transloco }}</ion-button>
  ```
- Les clés suivent la convention `SCREAMING_SNAKE_CASE` organisée par domaine fonctionnel.
- Tout ajout de clé dans `src/assets/i18n/fr.json` doit immédiatement s'accompagner de sa traduction dans `src/assets/i18n/en.json`.

---

## 🚀 Commandes de Développement

### Installation des dépendances
```bash
npm install
```

### Serveur de développement local
```bash
# Accès localhost (http://localhost:4200)
npm start
# ou
ng serve

# Accès depuis tablettes et smartphones sur le réseau local Wi-Fi
ng serve --host 0.0.0.0
```

### Vérification TypeScript & Zéro Problème IDE
```bash
npx tsc --noEmit
```

### Exécution des tests unitaires (Karma / Jasmine)
```bash
npm test
# ou en mode headless pour CI
npx ng test --watch=false --browsers=ChromeHeadless
```

### Exécution des tests End-to-End (Playwright)
```bash
npm run test:e2e
# ou avec interface visuelle
npx playwright test --ui
```

### Build de Production
```bash
npm run build
```
Les fichiers statiques optimisés pour Nginx et le Service Worker sont générés dans le dossier `dist/`.
