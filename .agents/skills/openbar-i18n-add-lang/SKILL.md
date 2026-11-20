---
name: openbar-i18n-add-lang
description: |
  Procédure complète pour ajouter et intégrer une nouvelle langue (ex: espagnol, allemand, italien) dans OpenBar.
  Génère le fichier de langue avec 100% de parité, configure le provider Transloco, met à jour les sélecteurs de langue UI,
  intègre les scripts de validation (pre-push, scan) et valide la suite de non-régression.

  Quand utiliser ce skill:
  - "ajoute une langue"
  - "nouvelle langue"
  - "crée la langue X"
  - "add language"
  - "support Spanish / German / Italian / ..."
  - "ajouter le support de l'espagnol"
---

# Skill : openbar-i18n-add-lang (New Language Integration Pipeline)

Ce skill décrit l'ensemble des étapes obligatoires pour ajouter une nouvelle langue dans OpenBar en garantissant une intégration propre de bout en bout (dictionnaire, configuration Transloco, sélecteurs d'interface, scripts de validation et tests d'intégrité).

---

## Les 6 Étapes d'Intégration d'une Nouvelle Langue

```
1. Fichier de langue  ──> frontend/src/assets/i18n/<lang>.json (100% des clés)
2. Transloco Config   ──> app.config.ts (availableLangs)
3. Sélecteur UI       ──> ProfileComponent, Navbar, Setup, Onboarding
4. Scripts & Outillage──> verify-i18n-parity.js, pre-push-check.js, prune-unused-i18n.js
5. Tests d'Intégrité  ──> i18n-integrity.spec.ts, transloco-testing.module.ts
6. Validation Finale  ──> pre-push-check.js, ng test
```

---

### Étape 1 — Création du Dictionnaire `<lang>.json`

1. Définir le code ISO de la langue (ex: `es` pour Espagnol, `de` pour Allemand, `it` pour Italien).
2. Cloner le dictionnaire de référence :
   ```bash
   cp frontend/src/assets/i18n/fr.json frontend/src/assets/i18n/<lang>.json
   ```
3. Traduire l'ensemble des valeurs en conservant :
   - L'arborescence JSON identique.
   - Les variables Transloco intactes (ex: `{{count}}`, `{{duration}}`, `{{name}}`).
   - Le vocabulaire métier CHR adapté (cocktails, barmans, serveurs, caisse, etc.).
4. Vérifier que le fichier est encodé en UTF-8 sans BOM et indenté à 2 espaces.

---

### Étape 2 — Déclaration dans la Configuration Transloco

Dans `frontend/src/app/app.config.ts` :
Ajouter le nouveau code de langue dans le tableau `availableLangs` :

```typescript
provideTransloco({
  config: {
    availableLangs: ['fr', 'en', '<lang>'],
    defaultLang: 'fr',
    fallbackLang: 'en',
    reRenderOnLangChange: true,
    prodMode: !isDevMode(),
  },
  loader: TranslocoHttpLoader,
})
```

---

### Étape 3 — Intégration dans les Sélecteurs de Langue UI

1. Ajouter le libellé de la nouvelle langue dans `fr.json`, `en.json` et `<lang>.json` (ex: `COMMON.LANGUAGES.<LANG>`).
2. Mettre à jour la liste des langues disponibles dans :
   - `frontend/src/app/features/profile/profile.component.ts` (sélecteur de langue utilisateur).
   - `frontend/src/app/features/onboarding/onboarding.component.ts` (wizard de bienvenue).
   - `frontend/src/app/features/setup/setup.component.ts` (initialisation administrateur).
   - Tout composant de barre supérieure ou modale affichant un sélecteur de langue.

---

### Étape 4 — Mise à Jour des Scripts d'Outillage & Validation

Mettre à jour les scripts dans `scripts/` pour inclure la nouvelle langue :

1. **`scripts/verify-i18n-parity.js`** :
   - Charger `<lang>.json` et vérifier la parité croisée stricte entre toutes les langues actives.
2. **`scripts/pre-push-check.js`** :
   - Dans le check `checkI18nParity()`, vérifier la parité complète de `<lang>.json` avec `fr.json` et `en.json`.
3. **`scripts/prune-unused-i18n.js`** :
   - Charger et élaguer `<lang>.json` au même titre que `fr.json` et `en.json` en mode `--fix`.
4. **`scripts/find-i18n.js`** :
   - Scanne automatiquement tous les fichiers `.json` du dossier `frontend/src/assets/i18n/`.

---

### Étape 5 — Mise à Jour des Suites de Tests

1. Dans `frontend/src/test/transloco-testing.module.ts` :
   - Importer `<lang>.json` et l'enregistrer dans `getTranslocoTestingModule` :
     ```typescript
     import <lang> from '../assets/i18n/<lang>.json';
     // ...
     langs: { fr, en, <lang> }
     ```
2. Dans `frontend/src/test/core/i18n-integrity.spec.ts` :
   - Ajouter la vérification de parité 100% et l'absence de chaînes vides pour `<lang>.json`.
   - Tester la résolution runtime effective avec `translocoService.setActiveLang('<lang>')`.

---

### Étape 6 — Validation Finale et Contrôle Qualité

Exécuter la chaîne de vérification complète :

```bash
# 1. Vérification de parité stricte
node scripts/verify-i18n-parity.js

# 2. Test Karma d'intégrité i18n
cd frontend && npx ng test --watch=false --browsers=ChromeHeadless --include src/test/core/i18n-integrity.spec.ts

# 3. Contrôle pré-push global
node scripts/pre-push-check.js
```

La nouvelle langue est alors 100% opérationnelle, couverte par les tests et protégée contre toute dérive future de parité.
