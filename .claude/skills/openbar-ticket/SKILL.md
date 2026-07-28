---
name: openbar-ticket
description: |
  Pipeline complet de traitement d'un ticket GitHub OpenBar : branche dédiée -> implémentation -> tests -> build -> PR -> auto-critique -> CI vert -> review Copilot -> merge -> clôture.

  Quand utiliser ce skill:
  - Traiter / implémenter un ticket GitHub sur OpenBar
  - "Traite le ticket #X"
  - "Implémente l'issue #X"
---

# Skill : openbar-ticket

Pipeline complet de traitement d'un ticket GitHub : branche dédiée → implémentation → tests → build → PR → auto-critique → CI vert → review Copilot → merge → clôture.

## Quand utiliser ce skill

**Toujours** — pour chaque ticket à implémenter, sans exception. Ce skill remplace la façon de travailler directement sur `dev`.

---

## Pipeline — 10 étapes obligatoires

### Étape 1 — Lire le ticket et se synchroniser

```bash
gh issue view <NUMERO> --repo FunWarry/Open-Bar
rtk git checkout dev && rtk git pull origin dev
```

- Identifier le **type** : `feat` · `fix` · `docs` · `chore` · `refactor`
- Identifier une **description courte** (2-4 mots, kebab-case, sans accent)
- Évaluer la **complexité** pour calibrer l'effort de review (voir étape 6)
- Passer le ticket en **"In progress"** sur le board :

```bash
rtk gh api graphql -f query='mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwHOBOlRss4Bac05"
    itemId: "<ITEM_ID>"
    fieldId: "PVTSSF_lAHOBOlRss4Bac05zhVUX3s"
    value: { singleSelectOptionId: "47fc9ee4" }
  }) { projectV2Item { id } }
}'
```

---

### Étape 2 — Créer la branche dédiée

**Convention :** `<type>/#<numero>-<description-courte>`

```bash
rtk git checkout -b feat/#<numero>-<description>
```

> Un ticket = une branche. Ne jamais mélanger plusieurs tickets non liés.

---

### Étape 3 — Implémenter

Suivre les conventions de `openbar-dev`.

**Règle de documentation :**
- **Documentation code OBLIGATOIRE** sur chaque composant/service/DTO/controller/guard/interceptor/store créé ou modifié.
- **TOUTE la documentation (JavaDoc, TSDoc, annotations OpenAPI) DOIT ÊTRE RÉDIGÉE EN ANGLAIS**.
- **INTERDICTION d'utiliser `@SuppressWarnings`** : résoudre directement les problèmes de code.

**Commits atomiques en conventional commits :**

```bash
rtk git add <fichiers-concernés>
rtk git commit -m "feat(#X): description courte"
```

- Un commit par unité logique
- Pas de mega-commits fourre-tout

---

### Étape 4 — Écrire les tests

**Règle absolue : les tests font partie du même ticket, pas d'un ticket séparé.**

#### Frontend (Angular — `src/test/`)

Structure miroir de `src/app/` :
```
src/test/features/<nom>/<composant>.spec.ts
src/test/features/<nom>/services/<service>.spec.ts
```

Couvrir pour chaque composant/service :
- ✅ Cas nominal (appel HTTP, rendu, interaction utilisateur)
- ✅ Cas d'erreur (HTTP 4xx/5xx, champ null, état vide)
- ✅ Cas limites (liste vide, valeur zéro, permissions insuffisantes)

Vérifier que les tests passent :
```bash
cd frontend && rtk npx ng test --watch=false --browsers=ChromeHeadless 2>&1 | tail -20
```

#### Backend (Java — `src/test/java/`)

Un test par méthode métier dans `XxxServiceTest` :
```java
@Test void methode_cas_comportementAttendu() { ... }
```

Vérifier :
```bash
cd backend && rtk mvn test -q 2>&1 | tail -20
```

**Commit des tests :**
```bash
rtk git add src/test/...
rtk git commit -m "test(#X): tests <NomComposant> et <NomService>"
```

---

### Étape 5 — Validation complète en LOCAL avant push (OBLIGATOIRE)

**Ne jamais pousser vers GitHub sans avoir exécuté et validé TOUS les tests et builds en local.** Cela évite les allers-retours inutiles et gagne du temps sur les runners CI.

1. **Frontend — Vérification TypeScript & Templates :**
```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

2. **Frontend — Exécution des tests Karma unitaires en local :**
```bash
cd frontend && npx ng test --watch=false --browsers=ChromeHeadless
```
> S'assurer que `ng test` passe à 100% sans erreur de type ou de chemin.

3. **Backend — Build, dépendances et tests Maven en local :**
```bash
cd backend && mvn test-compile dependency:copy-dependencies -DincludeScope=test -DoutputDirectory=target/dependency -q
```

4. **Scan Sonar & Qualité en LOCAL (OBLIGATOIRE avant tout push/commit) :**
```powershell
.\scripts\sonar-scan.ps1
```
> Si Sonar local signale un échec de Quality Gate ou un Code Smell, le corriger **immédiatement** avant d'effectuer tout commit ou push.

---

### Étape 6 — Push + création PR vers `dev`

```bash
rtk git push origin <branche>
```

Passer le ticket en **"In review"** sur le board :
```bash
rtk gh api graphql -f query='mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwHOBOlRss4Bac05"
    itemId: "<ITEM_ID>"
    fieldId: "PVTSSF_lAHOBOlRss4Bac05zhVUX3s"
    value: { singleSelectOptionId: "df73e18b" }
  }) { projectV2Item { id } }
}'
```

Créer la PR :
```bash
gh pr create \
  --base dev \
  --head <branche> \
  --title "<type>(#<numero>): <titre du ticket>" \
  --body "$(cat <<'EOF'
## Résumé
- <bullet 1>
- <bullet 2>

## Lien ticket
Closes #<NUMERO>

## Tests
- <ce qui est testé>

## Plan de test manuel
- [ ] <scenario 1>
- [ ] <scenario 2>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

### Étape 7 — Auto-critique

**Calibrer l'effort selon la complexité du ticket :**

| Type de ticket | Effort |
|----------------|--------|
| Fix simple, chore, docs | `--effort low` |
| Feature CRUD standard, refactor | `--effort medium` |
| Feature complexe (WebSocket, canvas, auth, state) | `--effort high` |

```
/code-review --effort <low|medium|high>
```

**Trier les findings :**
- ✅ Bug réel (null safety, race condition, logique incorrecte, sécurité) → corriger
- ✅ Nommage trompeur ou incohérence avec les conventions → corriger
- ⏭ Style subjectif sans impact → ignorer
- ⏭ Refactoring hors scope → créer un ticket séparé

**Questions systématiques :**
1. Zéro erreur TypeScript sur les fichiers modifiés ?
2. Tests : cas nominal + cas d'erreur + cas limites couverts ?
3. Templates HTML cohérents avec les modèles TypeScript ?
4. Aucun `any` non justifié ?
5. Conventions backend respectées (`@Transactional`, injection constructeur, DTO) ?

---

### Étape 8 — Corrections, re-run tests, vérification CI

Pour chaque issue trouvée :
```bash
rtk git add <fichier>
rtk git commit -m "fix(#X): <correction>"
rtk git push origin <branche>
```

**Attendre que TOUS LES CHECKS CI (y compris SonarCloud) soient 100% VERTS (`pass`) avant de merger :**
```bash
rtk gh pr checks <NUM> --repo FunWarry/Open-Bar --watch
```

**RÈGLE ABSOLUE ET STRICTE DE NON-MERGE AVANT ATTENTE DE SONARCLOUD :**
Ne JAMAIS exécuter `gh pr merge` ou soumettre une PR si :
1. Un seul check affiche `pending` ou `in_progress`.
2. SonarCloud Analysis n'est pas explicitement à **`pass`** (`QUALITY GATE STATUS: PASSED`).
3. Si SonarCloud est en `pending`, l'agent DOIT continuer d'attendre (`schedule` / `gh pr checks`) jusqu'à l'obtention du statut final `pass`.

Vérifier les trois checks obligatoires :
- ✅ `Frontend (Node 20 + Angular)` — build + tests Angular
- ✅ `Backend (Java 22 + Maven)` — build + tests Spring Boot
- ✅ `SonarCloud Analysis` — Quality Gate passé (PASSED)

**Si SonarCloud échoue :**
- **Quality Gate** (bloquant) : aller sur https://sonarcloud.io/project/overview?id=FunWarry_Open-Bar et lire les issues signalées
- Problèmes courants : code dupliqué, branches non couvertes par les tests, `any` TypeScript, méthodes trop longues
- Corriger, committer, re-push → SonarCloud re-analyse automatiquement

Si le CI/SonarCloud échoue sur des erreurs introduites par ce ticket → corriger et re-push.
Si le CI/SonarCloud échoue sur des erreurs pré-existantes non liées → documenter et continuer.

Répéter l'auto-critique si les corrections sont significatives.

---

### Étape 9 — Traiter les suggestions Copilot avant de merger

**Ne jamais merger sans avoir vérifié les commentaires du reviewer automatique `copilot-pull-request-reviewer`.**

```bash
gh api --paginate repos/FunWarry/Open-Bar/pulls/<NUM>/comments --jq '.[] | {path: .path, line: .line, body: .body}'
```

Pour **chaque** suggestion :
1. **La challenger** — est-elle réellement fondée (bug, incohérence, risque) ou juste du style/bruit ?
2. Si fondée → l'appliquer, ajouter/adapter un test si c'est un bug de logique, committer, re-push
3. Si non fondée → l'ignorer, sans commentaire nécessaire sur la PR (pas la peine de justifier chaque rejet)

Une suggestion Copilot peut pointer un vrai bug indépendant du sujet du ticket (ex : une contrainte de validation mesurée dans la mauvaise unité, une config qui ne fait pas ce qu'elle prétend faire) — les traiter avec le même sérieux qu'un finding de `/code-review`.

Si des corrections sont appliquées, **revérifier le CI** (étape 8) avant de passer à l'étape 10.

---

### Étape 10 — Merge, clôture et nettoyage

**Merger la PR dans `dev` — merge commit (pas squash) :**
```bash
mcp__plugin_github_github__merge_pull_request(
  pullNumber=<NUM>,
  merge_method="merge",
  commit_title="Merge feat/#X: <titre du ticket> → dev"
)
```

> ⚠️ Toujours `merge_method="merge"`, jamais `"squash"`. Le squash écrase la topologie de branche et rend l'historique illisible (commits directs sur dev sans trace des PRs et branches).

**Revenir sur dev, supprimer les branches locale ET distante :**
```bash
rtk git checkout dev && rtk git pull origin dev
rtk git branch -D <branche>
# La branche distante doit être supprimée — vérifier avec git branch -r
rtk git push origin --delete <branche>
rtk git fetch --prune
```

**Mettre à jour le tableau des features dans `CLAUDE.md` :**

Localiser la ligne du ticket dans le tableau "Features implémentées vs. manquantes" de `CLAUDE.md` et mettre à jour les colonnes Backend / Frontend / Tests avec ✅. Si la feature n'est pas dans le tableau, l'ajouter.

```bash
rtk git add CLAUDE.md
rtk git commit -m "docs: mise à jour features — #<NUMERO> implémenté"
rtk git push origin dev
```

**Clôturer le ticket sur le board (Done) :**
```bash
rtk gh api graphql -f query='mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwHOBOlRss4Bac05"
    itemId: "<ITEM_ID>"
    fieldId: "PVTSSF_lAHOBOlRss4Bac05zhVUX3s"
    value: { singleSelectOptionId: "98236657" }
  }) { projectV2Item { id } }
}'

gh issue close <NUMERO> --repo FunWarry/Open-Bar
```

---

## IDs de référence rapide (board)

| Champ | ID |
|-------|----|
| Project | `PVT_kwHOBOlRss4Bac05` |
| Status field | `PVTSSF_lAHOBOlRss4Bac05zhVUX3s` |

| Statut | Option ID |
|--------|-----------|
| Backlog | `f75ad846` |
| In progress | `47fc9ee4` |
| In review | `df73e18b` |
| Done | `98236657` |

---

## Checklist avant de merger

- [ ] Zéro erreur TypeScript (`rtk tsc --noEmit | grep -v node_modules`)
- [ ] Tests écrits : cas nominal + cas d'erreur + cas limites
- [ ] Tests passent (`ng test --watch=false` ou `mvn test`)
- [ ] CI vert sur la PR (`gh pr checks --watch`) — build Angular + tests
- [ ] SonarCloud vert — Quality Gate passé, pas de nouvelles issues bloquantes
- [ ] Suggestions Copilot (`copilot-pull-request-reviewer`) challengées une à une, fondées appliquées
- [ ] Aucun `any` non justifié
- [ ] Templates HTML cohérents avec les modèles TypeScript
- [ ] Conventional commits avec référence ticket
- [ ] PR description complète (résumé, tests, plan de test manuel)
- [ ] Board : In progress → In review → Done
- [ ] Branche locale supprimée après merge
- [ ] `CLAUDE.md` mis à jour (tableau features)

---

## Cas particuliers

### Plusieurs petits tickets liés

Si 2-3 tickets sont fortement couplés, ils peuvent partager une branche et une PR :
```
feat/#111-#112-crud-cocktails-ingredients
```
Mentionner `Closes #111` et `Closes #112` dans la PR.

### Ticket bloqué (dépendance manquante)

1. Documenter le blocage en commentaire sur l'issue
2. Passer en "Backlog"
3. Passer au ticket suivant

### PR avec conflits

```bash
rtk git checkout <branche>
rtk git merge dev
# Résoudre les conflits
rtk git add .
rtk git commit -m "chore: résolution conflits merge dev"
rtk git push origin <branche>
```

### SonarCloud Quality Gate échoue

Issues SonarCloud les plus fréquentes sur ce projet :
- **Couverture insuffisante** : ajouter des tests pour les branches non couvertes
- **Code dupliqué** : extraire dans un service ou une méthode partagée
- **`any` TypeScript** : typer explicitement
- **Méthode trop complexe** (cognitive complexity) : découper en méthodes privées
- **`console.log` oubliés** : supprimer avant merge

Pour voir les détails : `rtk gh pr checks <NUM> --repo FunWarry/Open-Bar` → suivre le lien SonarCloud.

### CI échoue sur erreurs pré-existantes

Si les erreurs CI ne sont pas introduites par ce ticket (vérifiable avec `git diff dev...HEAD`) :
1. Ouvrir un ticket `fix` séparé pour les corriger
2. Documenter dans la PR que le CI était déjà rouge avant ce ticket
3. Merger quand même si les erreurs sont confirmées pré-existantes
