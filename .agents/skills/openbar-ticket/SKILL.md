---
name: openbar-ticket
description: |
  Pipeline complet de traitement d'un ticket GitHub OpenBar intégrant nativement Grill-Me (cadrage interactif & interview de conception) et Boost (deep thinking, planification stratégique multi-perspectives & vérification rigoureuse) : cadrage interactif -> réflexion stratégique -> branche dédiée -> implémentation -> tests -> build -> PR -> auto-critique approfondie -> CI vert -> review Copilot -> merge -> clôture.

  Quand utiliser ce skill:
  - Traiter / implémenter un ticket GitHub sur OpenBar
  - "Traite le ticket #X"
  - "Implémente l'issue #X"
  - Traitement complet et approfondi d'une issue avec interview utilisateur (grill-me) et ingénierie stratégique (boost)
---

# Skill : openbar-ticket

Pipeline complet de traitement d'un ticket GitHub enrichi des démarches **Grill-Me** (cadrage interactif & interview de conception) et **Boost** (deep thinking, planification stratégique multi-perspectives & vérification rigoureuse).

Ce workflow garantit qu'aucune décision n'est prise à l'aveugle, que l'architecture est pensée en profondeur sous tous les angles critiques (sécurité, UI/UX, responsive, modularité, tests) et que l'exécution respecte 100% des règles absolues du projet OpenBar.

## Quand utiliser ce skill

**Toujours** — pour chaque ticket à implémenter, sans exception. Ce skill remplace la façon de travailler directement sur `dev`.

---

## Les Piliers Clés : Grill-Me & Boost intégrés

| Pilier | Moment clé | Rôle dans le pipeline |
|--------|------------|------------------------|
| 🎯 **Grill-Me** | Dès la découverte du ticket (Étape 1b) | **Interview interactive obligatoire** : l'agent interroge l'utilisateur (via `ask_question`) pour lever toutes les ambiguïtés, trancher les choix de conception, valider les règles métier, les composants UI et les cas limites avant de coder. |
| 🚀 **Boost** | Cadrage initial (Étape 1c) & Revue (Étape 7) | **Deep thinking & ingénierie multi-perspectives** : analyse approfondie sous 5 angles (Backend, Frontend, Modularité Plug-and-Play, Responsive 3 tiers, Tests/Seeding), anticipation des risques/régressions, plan stratégique détaillé et vérification rigoureuse. |

---

## Pipeline — 10 étapes obligatoires

### Étape 1 — Lire le ticket, se synchroniser et cadrer (Grill-Me & Boost)

#### 1.1 Synchronisation & Prise en charge
```bash
gh issue view <NUMERO> --repo FunWarry/Open-Bar
rtk git checkout dev && rtk git pull origin dev
```

- Identifier le **type** : `feat` · `fix` · `docs` · `chore` · `refactor`
- Identifier une **description courte** (2-4 mots, kebab-case, sans accent)
- Évaluer la **complexité** pour calibrer l'effort de review (voir étape 7)
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

#### 1.2 Phase Grill-Me — Cadrage Interactif & Interview de Conception (OBLIGATOIRE)
> 🎯 **Principe Grill-Me : Ne JAMAIS supposer à l'aveugle.**
> Avant de toucher au code ou de figer une architecture, mener un entretien de cadrage interactif avec l'utilisateur pour trancher les zones d'ombre, les options UX/UI et les arbitrages techniques.

1. **Utiliser systématiquement l'outil `ask_question`** lorsque des choix ou des alternatives existent (options à choix multiples claires avec option recommandée en premier).
2. **Questions clés à investiguer systématiquement :**
   - **Périmètre & Exigences Métier :** Quels sont les critères d'acceptation précis ? Qu'est-ce qui est strictement dans le scope vs explicitement hors scope ?
   - **Expérience Utilisateur (UX) & Design System :** Quel comportement sur mobile (< 768px) vs tablette POS (768-1024px) vs desktop (> 1024px) ? Quels composants partagés du Design System doivent être réutilisés (`app-searchable-select`, `app-modal`, `app-action-button`, etc.) ?
   - **Règles Métier & Cas d'Erreur :** Que se passe-t-il en cas de données vides, de coupure réseau, d'erreur serveur ou de permissions insuffisantes ?
   - **Sécurité & Permissions :** Quels rôles ont accès à cette fonctionnalité (`ROLE_SERVEUR`, `ROLE_BARMAN`, `ROLE_MANAGER`, `ROLE_ADMIN`) ? Quelles annotations `@PreAuthorize` appliquer ?
   - **Modularité Plug-and-Play :** Cette fonctionnalité doit-elle être activable/désactivable par établissement (`EstablishmentModule`) ? Quel statut par défaut ?
3. **Attendre et intégrer les réponses de l'utilisateur** avant de passer à la planification technique.

---

#### 1.3 Phase Boost — Deep Thinking & Planification Stratégique Multi-Perspectives (OBLIGATOIRE)
> 🚀 **Principe Boost : Réflexion approfondie et stratégie rigoureuse.**
> Analyser le ticket sous toutes les facettes de l'ingénierie logicielle pour anticiper chaque impact avant d'écrire la moindre ligne de code.

1. **Analyse sous 5 perspectives fondamentales :**
   - **Perspective Backend :** Respect de l'architecture Spring Boot 4 / Java 22, injection par constructeur stricte, DTOs Java record (`from(Entity)`), transactions `@Transactional`, gestion des exceptions (`ResourceNotFoundException`, `BusinessException`), documentation JavaDoc & annotations OpenAPI exhaustives en anglais, zéro `@SuppressWarnings`.
   - **Perspective Frontend :** Architecture Angular 22 standalone, composants Ionic 9, interdiction absolue des contrôles HTML bruts (Design System obligatoire), zéro couleur en dur (variables CSS adaptatives du thème), parité stricte Transloco `fr.json` et `en.json`, TSDoc en anglais.
   - **Perspective Multi-Device & Responsive :** Garantie des 3 tiers (Mobile smartphone < 768px colonne unique touch hit target ≥ 44px, Tablette 768-1024px grille tactile dense, Desktop > 1024px vue de supervision multi-colonnes).
   - **Perspective Modularité Plug-and-Play :** Intégration backend (`EstablishmentModule`), protection des routes frontend (`ModuleGuard`), toggle dans les paramètres (`AppSettingsPageComponent`) et l'onboarding (`/setup`).
   - **Perspective Tests & Données de Démo :** Pyramide complète (Karma, JUnit 5, Testcontainers, Playwright E2E) et enrichissement immédiat de `demo_dataset.json` et `SampleDataSeederService.java` pour tests manuels directs.
2. **Élaboration du Plan d'Action Stratégique Boost :**
   - Structurer un plan séquentiel d'implémentation clair et validé (Backend → Frontend → Tests → Seeder → Pre-push).
   - Anticiper les risques de régression et les impacts collatéraux sur l'existant.

---

### Étape 2 — Créer la branche dédiée

**Convention :** `<type>/#<numero>-<description-courte>`

```bash
rtk git checkout -b feat/#<numero>-<description>
```

> Un ticket = une branche. Ne jamais mélanger plusieurs tickets non liés.

---

### Étape 3 — Implémenter avec rigueur d'ingénierie Boost

Appliquer strictement les conventions de `openbar-dev` et les décisions d'architecture arrêtées lors du **Grill-Me**.

**Règles d'Exécution Boost :**
- **Fidélité au Cadrage Grill-Me** : implémenter exactement les choix validés avec l'utilisateur (UX, règles métier, granularité des modules).
- **Documentation code OBLIGATOIRE (en Anglais)** sur chaque composant/service/DTO/controller/guard/interceptor/store créé ou modifié (JavaDoc, TSDoc, annotations OpenAPI `@Tag`, `@Operation`, `@ApiResponse`).
- **INTERDICTION ABSOLUE d'utiliser `@SuppressWarnings`** : résoudre directement et proprement chaque problème ou warning.
- **INTERDICTION STRICTE DES CONTRÔLES HTML BRUTS (Design System Obligatoire)** :
  - ❌ Pas de `<select>` / `<ion-select>` ➡️ `<app-searchable-select>` (`SearchableSelectComponent`)
  - ❌ Pas de `<input type="checkbox">` ➡️ `<app-checkbox-field>` (`CheckboxFieldComponent`) ou `<app-toggle-switch>` (`ToggleSwitchComponent`)
  - ❌ Pas de `<button>` ➡️ `<app-action-button>` (`ActionButtonComponent`)
  - ❌ Pas de `<input type="text">` / `type="number"` ➡️ `<app-input-field>` (`InputFieldComponent`)
  - ❌ Pas de puces de filtrage bricolées ➡️ `<app-filter-chip>` (`FilterChipComponent`)
  - ❌ Pas de modals personnalisées avec backdrop ad-hoc ➡️ `<app-modal>` (`ModalComponent`)
- **Responsive 3 tiers systématique** : tester et adapter en direct l'affichage pour Mobile (< 768px), Tablette (768-1024px) et Desktop (> 1024px).
- **Zéro couleur en dur** : n'utiliser que les variables CSS du thème de `theme/variables.css`.
- **Parité i18n systématique** : chaque clé de texte doit être ajoutée simultanément dans `fr.json` et `en.json`.

**Commits atomiques en conventional commits :**

```bash
rtk git add <fichiers-concernés>
rtk git commit -m "feat(#X): description courte"
```

- Un commit par unité logique
- Pas de mega-commits fourre-tout

---

### Étape 4 — Écrire les tests (Unitaires, Non-Régression, Intégration et E2E)

> 💡 **Automatisation :** Utiliser le skill `openbar-test-gen` pour générer automatiquement l'intégralité de la pyramide de tests requise ainsi que le jeu de démo.

**Règle absolue : les tests font partie intégrante du même ticket, pas d'un ticket séparé.**

#### 1. Tests Unitaires & Non-Régression Frontend (Karma — `src/test/`)
- Structure miroir de `src/app/` dans `frontend/src/test/`
- Couvrir pour chaque composant/service :
  - ✅ Cas nominal (appel HTTP, rendu, interaction utilisateur)
  - ✅ Cas d'erreur (HTTP 4xx/5xx, champ null, état vide)
  - ✅ Cas limites (liste vide, valeur zéro, permissions insuffisantes)
  - ✅ Non-régression : test dédié pour tout bugfix
  - ✅ Zéro `any`

#### 2. Tests Unitaires & Non-Régression Backend (JUnit 5 + Mockito — `backend/src/test/java/`)
- Un test par méthode métier dans `XxxServiceTest` (nominal, erreurs, limites, non-régression).

#### 3. Tests d'Intégration Backend (Spring Boot + Testcontainers)
- Pour toute nouvelle logique ou flow API (`backend/src/test/java/.../integration/`).

#### 4. Tests E2E Frontend (Playwright — `frontend/e2e/`)
- Pour toute modification d'écran, formulaire ou workflow utilisateur.
- Utiliser les attributs `data-testid`.

#### 5. Données de Test & Démonstration Plateforme (Seeding — `data/demo_dataset.json`)
- **OBLIGATOIRE** pour toute nouvelle entité ou feature : mettre à jour le fichier `backend/src/main/resources/data/demo_dataset.json` et le service `SampleDataSeederService.java` (ou seeders dédiés).
- Fournir des données réalistes, des états initiaux variés (actif, archivé, en attente, réglé, etc.) afin que les développeurs et testeurs puissent directement tester la feature sur la plateforme en mode dev/test sans configuration manuelle préalable.

**Commit des tests & données de démo :**
```bash
git add frontend/src/test/... backend/src/test/... frontend/e2e/... backend/src/main/resources/data/demo_dataset.json backend/src/main/java/.../SampleDataSeederService.java
git commit -m "test(#X): unit, non-regression, integration, e2e tests and platform demo dataset"
```

---

### Étape 5 — Validation complète en LOCAL avant push (OBLIGATOIRE)

**Ne jamais pousser vers GitHub sans avoir exécuté et validé la suite pré-push.**

> 🚀 **Automatisation Pré-Push (`openbar-pre-push`) :**
> Lancer la suite de vérification complète en une commande :
> ```bash
> node scripts/pre-push-check.js
> ```
> Ce script valide automatiquement les 5 points critiques en ~12s :
> - Parité Transloco i18n (`fr.json` vs `en.json`)
> - Zéro `@SuppressWarnings` dans les fichiers modifiés
> - Zéro couleur hexadécimale en dur (variables CSS obligatoires)
> - Zéro problème IDE / compilation TypeScript propre (`npx tsc --noEmit`)
> - Compilation Java 22 / Spring Boot 4 (`mvn test-compile -q`)

1. **Exécution des tests unitaires Frontend :**
```bash
cd frontend && npx ng test --watch=false --browsers=ChromeHeadless
```
> **RÈGLE STRICTE ZÉRO PROBLÈMES IDE** : Vérifier que la fenêtre "Problems" de l'IDE (et `@[current_problems]`) est 100% vide (0 erreur, 0 warning). Ne JAMAIS pousser avec le moindre warning ou problème résiduel.

2. **Architecture Modulaire Plug & Play (OBLIGATOIRE)** :
> Toute nouvelle fonctionnalité majeure ou capability métier doit être un module activable/désactivable dans l'onboarding (`/setup`) et les paramètres (`AppSettingsPageComponent` onglet "Capacités & Modules"). Vérifier que désactiver le module masque les éléments d'interface et protège les routes (`ModuleGuard`).

3. **Frontend — Tests E2E Playwright en local (si applicable) :**
```bash
cd frontend && npm run test:e2e
```

4. **Backend — Tests Maven (unitaires + intégration) :**
```bash
cd backend && mvn test -q
```

5. **Scan Sonar & Qualité en LOCAL :**
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

### Étape 7 — Auto-critique & Audit Approfondi Boost (Deep Review)

Adopter la rigueur d'analyse **Boost** : auditer le code sous toutes les perspectives techniques et vérifier la conformité avec les arbitrages du **Grill-Me**.

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

**Grille d'Audit Approfondi Boost (Vérification Multi-Perspectives) :**
1. **Conformité Grill-Me :** Les décisions validées avec l'utilisateur ont-elles été respectées à 100% sans dérive de périmètre ni omission ?
2. **Qualité & Types :** Zéro erreur TypeScript, zéro `any` résiduel, zéro problème dans la fenêtre Problems de l'IDE (`@[current_problems]`).
3. **Sécurité :** Contrôle des accès `@PreAuthorize`, absence d'injection, validation des entrées, pas de fuite de données sensibles dans les DTOs ou les logs.
4. **Design System & Responsive :** Aucun contrôle HTML brut, composants UI partagés réutilisés, variables CSS adaptatives respectées, rendu impeccable sur Smartphone (< 768px), Tablette (768-1024px) et Desktop (> 1024px).
5. **Couverture de Tests :** Pyramide complète (unitaires, non-régression, intégration, Playwright E2E) et jeu de données de démo (`demo_dataset.json`) mis à jour.
6. **Conventions Backend & Frontend :** Injection par constructeur, DTOs immuables, `@Transactional`, parité Transloco `fr.json` et `en.json`, documentation en anglais partout.

---

### Étape 8 — Corrections, re-run tests, vérification CI

> 🤖 **Surveillance & Auto-Patching CI (`openbar-ci-watch`) :**
> Déclencher le skill `openbar-ci-watch` pour surveiller les checks, extraire automatiquement les logs en cas d'erreur (`gh run view --log-failed`), appliquer les patchs nécessaires et attendre que les 3 checks soient au vert.

Pour chaque issue trouvée :
```bash
git add <fichier>
git commit -m "fix(#X): <correction>"
node scripts/pre-push-check.js
git push origin <branche>
```

**Attendre que TOUS LES CHECKS CI (y compris SonarCloud) soient 100% VERTS (`pass`) avant de merger :**
```bash
gh pr checks <NUM> --repo FunWarry/Open-Bar --watch
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

**Mettre à jour les Knowledge Items (KIs) — OBLIGATOIRE après chaque merge :**

Déclencher le skill `openbar-ki-update` pour synchroniser les KIs avec l'état réel du projet :
- Mettre à jour `features-state.md` (tableau des features Backend ✅ / Frontend ✅ / Tests ✅)
- Mettre à jour `architecture.md` si nouvelle entité, nouveau topic WS, ou bug corrigé
- Mettre à jour `conventions.md` si nouveau pattern de code établi
- Committer les KIs sur `dev` (`.agents/knowledge/`) :
```bash
rtk git add .agents/knowledge/
rtk git commit -m "docs: sync Knowledge Items & features state after #<NUMERO> merge"
rtk git push origin dev
```

> ⚠️ Les KIs sont la mémoire inter-sessions d'Antigravity — un KI obsolète entraîne des régressions à la session suivante.

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

- [ ] **Cadrage interactif Grill-Me validé** : toutes les décisions d'architecture, UX et règles métier ont été clarifiées et tranchées avec l'utilisateur
- [ ] **Ingénierie & Revue Boost validées** : réflexion multi-perspectives approfondie effectuée, zéro contournement ni compromis technique
- [ ] Zéro erreur TypeScript (`rtk tsc --noEmit | grep -v node_modules`)
- [ ] **Zéro problème dans la fenêtre Problems de l'IDE** (`@[current_problems]` 100% vide, 0 warning, 0 error)
- [ ] **Architecture Plug-and-Play respectée** : feature activable/désactivable dans les paramètres (`AppSettingsPageComponent`) et l'onboarding (`/setup`)
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
- [ ] **KIs mis à jour** (`openbar-ki-update`) — `features-state.md` (tableau features), `architecture.md` si nécessaire
- [ ] **`fr.json` + `en.json` mis à jour** si le ticket touché le frontend (même commit que le composant)
- [ ] **Onboarding & Configuration mis à jour** si la feature nécessite d'être configurée ou initialisée (`/setup`, `OnboardingComponent`, `AppSettingsPageComponent`)
- [ ] **Données de test et démo plateforme mises à jour** (`demo_dataset.json`, `SampleDataSeederService.java`) pour tester immédiatement en mode dev/test avec les bonnes données


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
