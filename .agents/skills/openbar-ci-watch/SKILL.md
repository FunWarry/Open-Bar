---
name: openbar-ci-watch
description: |
  Surveillance autonome des vérifications GitHub CI & SonarCloud, extraction automatique des logs d'erreur en cas d'échec, auto-patching et attente du statut 100% vert.

  Quand utiliser ce skill:
  - "watch CI"
  - "surveille la CI"
  - "attends que les checks passent"
  - "vérifie le statut du CI"
  - "fix CI"
  - Étape 8 obligatoire de openbar-ticket et openbar-fast-ticket
---

# Skill : openbar-ci-watch

Surveille de manière proactive et autonome les pipelines CI GitHub Actions et l'analyse SonarCloud pour une Pull Request OpenBar. En cas d'échec, extrait les logs d'erreur, applique automatiquement les correctifs nécessaires, revalide avec `openbar-pre-push`, repousse la branche et attend jusqu'à ce que tous les feux soient verts.

---

## 1. Suivi des Vérifications CI

Surveiller l'avancement des checks avec la commande GitHub CLI :

```bash
gh pr checks <PR_NUMBER> --repo FunWarry/Open-Bar
```

Ou en mode interactif/suivi :
```bash
gh pr checks <PR_NUMBER> --repo FunWarry/Open-Bar --watch
```

### Les 3 Checks Obligatoires (Tous doivent être à `pass` / `SUCCESS`)

1. **Frontend (Node 20 + Angular)** :
   - Compilation TypeScript en mode production.
   - Exécution de la suite de tests unitaires Karma / Jasmine en mode headless.
2. **Backend (Java 22 + Maven)** :
   - Compilation Spring Boot 4 avec JDK 22.
   - Exécution des tests unitaires JUnit 5 et tests d'intégration.
3. **SonarCloud Analysis (Quality Gate)** :
   - Analyse statique de code, couverture, complexité cyclomatique, duplications et failles de sécurité.
   - **RÈGLE ABSOLUE :** Le statut doit être impérativement `pass` (`QUALITY GATE STATUS: PASSED`). Jamais `pending` ni `failed` au moment du merge.

---

## 2. Extraction & Diagnostic des Échecs CI

Si l'un des checks passe au rouge (`fail` ou `FAILURE`) :

### Étape 2.1 — Récupérer les logs du run défaillant

```bash
# Lister les runs récents pour la PR ou branche
gh run list --branch <BRANCHE> --repo FunWarry/Open-Bar --limit 3

# Extraire les logs d'erreur du job en échec
gh run view <RUN_ID> --log-failed --repo FunWarry/Open-Bar
```

### Étape 2.2 — Classifier l'erreur

| Type d'échec | Diagnostic typique | Procédure de correction |
|--------------|---------------------|--------------------------|
| **Karma / Frontend Test** | Assertion en échec ou mock manquant dans `frontend/src/test/` | Adapter le test unitaire ou corriger la logique du composant. Exécuter `npx ng test --watch=false` en local. |
| **Backend Test Failure** | Assertion JUnit en échec dans `backend/src/test/java/` | Corriger la règle métier ou le mock Mockito. Exécuter `mvn test -q` en local. |
| **SonarCloud Quality Gate** | Duplication de code, branches non couvertes, cognitive complexity | Réduire la complexité des méthodes, extraire les blocs dupliqués, ajouter des tests unitaires pour couvrir les branches edge cases. |
| **SonarCloud Code Smell** | Utilisation de `any`, variable inutilisée, commentaire todo | Remplacer `any` par un type précis ou une interface, nettoyer les imports et variables inutilisées. |

---

## 3. Boucle d'Auto-Patching & Re-validation

Dès que la cause racine est identifiée :

1. **Appliquer la modification** sur le code source ou les fichiers de tests.
2. **Exécuter la validation locale** :
   ```bash
   node scripts/pre-push-check.js
   ```
3. **Committer et repousser** :
   ```bash
   git add <fichiers-modifiés>
   git commit -m "fix(#X): resolve CI failure in <composant/test>"
   git push origin <BRANCHE>
   ```
4. **Reprendre la surveillance** avec `gh pr checks <PR_NUMBER> --watch` jusqu'à validation complète.

---

## 4. Condition de Succès (Vert Total)

La tâche est considérée comme réussie dès que la commande retourne :

```
Frontend (Node 20 + Angular)       pass    ...
Backend (Java 22 + Maven)          pass    ...
SonarCloud Analysis                pass    ...
```

À ce stade, passer au traitement des commentaires Copilot (Étape 9 de `openbar-ticket`) puis au merge (`openbar-post-merge`).
