---
name: openbar-i18n-clean
description: |
  Analyse statique et élagage autonome des clés de traduction Transloco inutilisées et orphelines dans OpenBar.
  Identifie les clés orphelines dans les templates Angular (*.html) et fichiers TypeScript (*.ts),
  protège les clés dynamiques et la safelist (statuts, enums, jours), supprime les clés mortes en miroir dans fr.json et en.json
  et préserve 100% de parité stricte sans rupture runtime.

  Quand utiliser ce skill:
  - "clean i18n"
  - "prune i18n"
  - "nettoie les traductions"
  - "supprime les clés orphelines"
  - "scan i18n"
  - "vérifie les clés inutilisées"
  - Après de gros refactorings ou suppressions de composants
---

# Skill : openbar-i18n-clean (Static Analysis & Pruning)

Ce skill automatise la détection et la suppression chirurgicale des clés de traduction Transloco inutilisées / orphelines à travers l'ensemble des fichiers de langues d'OpenBar (`fr.json`, `en.json`).

Il permet d'alléger la taille du bundle frontend, de faciliter la maintenance des traductions et de garantir une propreté continue sans jamais supprimer de clés dynamiques légitimes ni rompre la parité linguistique.

---

## Les 3 Piliers de l'Élagage Sécurisé

| Pilier | Mécanisme | Garantie |
|---|---|---|
| 🔍 **Détection Hybride** | Analyse AST & littéraux dans `*.html`, `*.ts` + détection des concaténations (`'PREFIX.' + x`) | Toutes les clés utilisées statiquement et dynamiquement sont protégées. |
| 🛡️ **Safelist Métier** | Préservation systématique des statuts, énumérations et tokens design (`COMMANDES.STATUTS.*`, `DAYS.*`, `COMMON.*`, etc.) | Zéro régression ou clé manquante lors des affichages dynamiques. |
| ⚖️ **Parité Miroir 100%** | Suppression synchronisée des clés dans `fr.json` et `en.json` avec élagage récursif des objets parents vides | Zéro divergence entre les langues, conformité totale au pre-push. |

---

## Workflow d'Élagage en 5 Étapes

### Étape 1 — Rapport d'Analyse (Dry Run)

Lancer l'analyse statique sans modifier les fichiers pour auditer l'état actuel :

```bash
# Via script direct à la racine
node scripts/prune-unused-i18n.js --dry-run

# Ou via npm dans frontend/
cd frontend && npm run i18n:scan
```

Ce mode indique :
- Le nombre total de fichiers scannés (`src/` et `e2e/`).
- Le nombre total de clés chargées.
- Les préfixes dynamiques détectés dans le code.
- Le nombre de clés orphelines identifiées et leur pourcentage d'économie potentiel.
- Un échantillon des 25 premières clés orphelines candidates.

---

### Étape 2 — Revue de Sécurité des Clés Détectées

Avant d'appliquer la suppression :
1. Vérifier si certaines clés orphelines détectées ne sont pas consommées par un futur composant en cours de développement.
2. Si une nouvelle famille de clés dynamiques apparaît (ex: nouvel enum affiché via concaténation `'MY_MODULE.STATUS_' + s`), s'assurer qu'elle est bien couverte par la détection de préfixes ou ajoutée dans `SAFELIST_PATTERNS` de `scripts/prune-unused-i18n.js`.

---

### Étape 3 — Exécution de l'Élagage (`--fix`)

Appliquer le nettoyage effectif :

```bash
# À la racine
node scripts/prune-unused-i18n.js --fix

# Ou via npm dans frontend/
cd frontend && npm run i18n:prune
```

L'outil :
1. Supprime les clés orphelines dans `fr.json` ET `en.json`.
2. Nettoie récursivement les conteneurs d'objets devenus vides.
3. Reformate proprement le JSON avec indentation standard à 2 espaces et retour à la ligne final.
4. Valide immédiatement la parité stricte à 100% post-élagage.

---

### Étape 4 — Vérification de l'Intégrité & Non-Régression

Valider immédiatement que l'élagage est parfait :

```bash
# 1. Vérification de parité stricte (0 clé divergente)
node scripts/verify-i18n-parity.js

# 2. Test unitaire du moteur de pruning
node scripts/test-prune-unused-i18n.js

# 3. Suite Karma d'intégrité et résolution runtime
cd frontend && npx ng test --watch=false --browsers=ChromeHeadless --include src/test/core/i18n-integrity.spec.ts
```

---

### Étape 5 — Validation Pré-Push & Commit

Lancer la suite de conformité complète OpenBar :

```bash
node scripts/pre-push-check.js
```

Puis committer selon la convention :
```bash
git add frontend/src/assets/i18n/fr.json frontend/src/assets/i18n/en.json
git commit -m "refactor(i18n): prune orphaned translation keys and maintain 100% parity"
```
