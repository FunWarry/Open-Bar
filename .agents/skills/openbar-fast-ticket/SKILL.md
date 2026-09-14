---
name: openbar-fast-ticket
description: |
  Pipeline automatisé de traitement express de tickets mineurs, bugfixes ou tâches ciblées : enchaîne de bout en bout l'implémentation, la génération de tests, la validation pre-push, la PR, la surveillance CI et la clôture.

  Quand utiliser ce skill:
  - "fast ticket #X"
  - "traite rapidement le ticket #X"
  - "express ticket #X"
  - "quick fix #X"
  - "traite le bugfix #X"
---

# Skill : openbar-fast-ticket

Pipeline express tout-en-un conçu pour accélérer et automatiser le traitement complet des tickets ciblés, correctifs (bugfixes), petites fonctionnalités et tâches de maintenance sans compromettre la qualité ni les règles absolues du projet.

Ce workflow orchestre les compétences OpenBar (`openbar-test-gen`, `openbar-pre-push`, `openbar-ci-watch`, `openbar-post-merge`) en une seule passe autonome.

---

## Les 7 Étapes Automatisées

### 1. Synchronisation & Prise en Charge
1. Récupération des informations du ticket :
   ```bash
   gh issue view <NUMERO> --repo FunWarry/Open-Bar
   ```
2. Mise à jour de la branche de référence `dev` :
   ```bash
   git checkout dev && git pull origin dev
   ```
3. Déplacement du ticket sur le board Project V2 en **"In progress"** (option `47fc9ee4`).

---

### 2. Branche Dédiée & Implémentation
1. Création de la branche :
   ```bash
   git checkout -b <type>/#<NUMERO>-<description-courte>
   ```
2. Implémentation du correctif ou de la fonctionnalité en respectant :
   - **Anglais obligatoire** pour le code, les commentaires et la documentation (JavaDoc / TSDoc).
   - **Zéro `@SuppressWarnings`**.
   - **Composants UI partagés** réutilisés (`frontend/src/app/core/components/ui/`).
   - **Parité i18n** systématique (`fr.json` et `en.json`).
   - **Modularité Plug-and-Play** si nouvelle capability (`EstablishmentModule` / `ModuleGuard`).

---

### 3. Génération Autonome des Tests (`openbar-test-gen`)
1. Génération du test unitaire et de non-régression (Karma frontend dans `frontend/src/test/` sans aucun `any`, ou JUnit 5 backend).
2. Ajout/adaptation des données de démo dans `demo_dataset.json` si une entité est impactée.
3. Exécution rapide des tests en local.

---

### 4. Porte de Qualité Pré-Push (`openbar-pre-push`)
Exécution obligatoire du script de contrôle :
```bash
node scripts/pre-push-check.js
```
> Si le script échoue (TypeScript, i18n, `@SuppressWarnings`, couleurs en dur, compilation Maven), correction immédiate avant tout commit.

---

### 5. Commit Atomique & Création de la PR
1. Commit au format conventionnel :
   ```bash
   git add <fichiers>
   git commit -m "<type>(#<NUMERO>): <description>"
   git push origin <type>/#<NUMERO>-<description-courte>
   ```
2. Déplacement du ticket sur le board en **"In review"** (option `df73e18b`).
3. Création de la Pull Request avec mention `Closes #<NUMERO>` :
   ```bash
   gh pr create --base dev --head <BRANCHE> --title "<type>(#<NUMERO>): <titre>" --body "Closes #<NUMERO>"
   ```

---

### 6. Surveillance CI & Auto-Patching (`openbar-ci-watch`)
1. Surveillance des checks GitHub Actions :
   ```bash
   gh pr checks <PR_NUM> --repo FunWarry/Open-Bar --watch
   ```
2. Attente impérative que **Frontend**, **Backend** et **SonarCloud Analysis** soient tous à `pass`.
3. En cas d'échec : extraction automatique des logs (`gh run view --log-failed`), application du patch, re-check `pre-push`, commit et re-push.
4. Vérification et traitement des éventuelles remarques Copilot.

---

### 7. Clôture Post-Merge & Mise à Jour KIs (`openbar-post-merge`)
1. Fusion de la PR avec **merge commit** (`--merge`, jamais squash) :
   ```bash
   gh pr merge <PR_NUM> --merge --repo FunWarry/Open-Bar
   ```
2. Retour sur `dev`, pull et suppression des branches locale et distante (`git fetch --prune`).
3. Clôture de l'issue GitHub et passage du ticket en **"Done"** sur le Project Board (option `98236657`).
4. Déclenchement de `openbar-ki-update` pour synchroniser `features-state.md` et `architecture.md`.
