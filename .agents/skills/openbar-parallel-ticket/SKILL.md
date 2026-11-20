---
name: openbar-parallel-ticket
description: |
  Pipeline de traitement d'un ticket GitHub OpenBar en environnement multi-agents / multi-conversations parallèles.
  Utilise nativement les Git Worktrees pour une isolation physique 100% étanche de l'espace de travail (zéro conflit de branche ou de fichier local),
  avec liaison instantanée des node_modules, cadrage Grill-Me & Boost, gestion des synchronisations concurrentes sur dev,
  et nettoyage automatique du worktree post-merge.

  Quand utiliser ce skill:
  - "Traite le ticket #X en parallèle"
  - "Lance le ticket #X dans un worktree"
  - "Parallélise le ticket #X"
  - Quand plusieurs tickets GitHub sont traités en même temps dans des conversations séparées
---

# Skill : openbar-parallel-ticket (Multi-Agents & Git Worktrees)

Ce skill est une adaptation du pipeline **`openbar-ticket`** spécialement conçue pour travailler sur **plusieurs tickets en simultané dans des conversations séparées**, sans qu'aucun agent ne vienne écraser le travail d'un autre.

Il repose sur l'utilisation **100% native des Git Worktrees** (`git worktree`) :
chaque agent/conversation opère dans son propre dossier physique isolé (`.worktrees/ticket-<N>`), dispose de sa propre branche active et de son propre cycle de tests, tout en partageant instantanément l'historique `.git` et les dépendances `frontend/node_modules` (via une jonction NTFS Windows).

---

## Les 3 Piliers du Travail Parallèle

| Pilier | Mécanisme | Bénéfice |
|--------|-----------|----------|
| 🛡️ **Isolation Worktree** | `git worktree add .worktrees/ticket-<N>` | Aucune collision de branche ou de checkout. Deux agents éditent, compilent et testent en même temps sans conflit local. |
| ⚡ **Zéro npm install** | `cmd /c mklink /J ...\node_modules` | Partage instantané du dossier `frontend/node_modules` du repo racine en 0.1s (aucun téléchargement). |
| 🔄 **Sync Anti-Conflit** | `git fetch origin dev && git merge origin/dev` | Avant de merger la PR, l'agent intègre automatiquement les éventuels merges des autres tickets concurrents et résout les collisions (notamment sur `fr.json`/`en.json`). |

---

## Pipeline — 10 étapes adaptées au travail parallèle

### Étape 1 — Lire le ticket et cadrer (Grill-Me & Boost)

#### 1.1 Récupérer le ticket & passer en "In progress"
```bash
gh issue view <NUMERO> --repo FunWarry/Open-Bar
```

Identifier le **type** (`feat` · `fix` · `docs` · `chore` · `refactor`) et une **description courte** (kebab-case).

Passer le ticket en **"In progress"** sur le board :
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

#### 1.2 Phase Grill-Me & Boost
Comme dans `openbar-ticket` :
- **Grill-Me** : interview interactive via `ask_question` si ambiguïtés métier, UX ou permissions.
- **Boost** : analyse multi-perspectives (Backend, Frontend, Responsive 3 tiers, Modularité Plug-and-Play, Tests & Seeding).

---

### Étape 2 — Créer le Git Worktree dédié

> ⚠️ **Règle absolue : Ne JAMAIS faire de `git checkout` dans le répertoire racine !**  
> Tout le travail de la conversation se déroule dans `.worktrees/ticket-<NUMERO>`.

**1. Récupérer le dernier état de `dev` :**
```bash
git fetch origin dev
```

**2. Créer le worktree et la branche dédiée :**
Convention de branche : `<type>/#<numero>-<description-courte>`

```bash
git worktree add .worktrees/ticket-<NUMERO> -b <type>/#<NUMERO>-<description> origin/dev
```

**3. Lier instantanément `node_modules` (jonction NTFS Windows, quasi-instantané) :**
```bash
cmd /c mklink /J .worktrees\ticket-<NUMERO>\frontend\node_modules frontend\node_modules
```

> 💡 Dès cette étape, le dossier `.worktrees/ticket-<NUMERO>` est un clone de travail complet et opérationnel. Le repo racine reste intact sur sa propre branche.

---

### Étape 3 — Travailler et implémenter dans le Worktree

**Important pour l'agent :**
- Tous les chemins de fichiers doivent cibler `.worktrees/ticket-<NUMERO>/...` (ou le sous-dossier correspondant).
- Toutes les commandes shell (`git`, `npm`, `mvn`, `node`) doivent s'exécuter avec le préfixe ou `cd .worktrees/ticket-<NUMERO>`.

**Exemple d'exécution de commande dans le worktree :**
```powershell
Set-Location -Path .worktrees/ticket-<NUMERO>; git status
```

Appliquer strictement les conventions OpenBar (Boost) :
- Zéro contrôle HTML brut (Design System obligatoire : `app-searchable-select`, `app-action-button`, `app-modal`, etc.)
- Zéro couleur en dur (variables CSS adaptatives)
- Parité Transloco `fr.json` & `en.json`
- Documentation en anglais (JavaDoc, TSDoc, OpenAPI)
- Pas de `@SuppressWarnings`

**Commits atomiques dans le worktree :**
```powershell
Set-Location -Path .worktrees/ticket-<NUMERO>; git add <fichiers>; git commit -m "feat(#X): <description>"
```

---

### Étape 4 — Écrire les tests et enrichir le demo dataset

Toujours dans le worktree :
1. Tests unitaires frontend Karma (`frontend/src/test/`) sans `any`.
2. Tests unitaires backend JUnit 5 (`backend/src/test/java/`).
3. Données de démo et seeder : `backend/src/main/resources/data/demo_dataset.json` et `SampleDataSeederService.java`.
4. Tests E2E Playwright si modification d'écran/flux.

Commit des tests dans le worktree :
```powershell
Set-Location -Path .worktrees/ticket-<NUMERO>; git add .; git commit -m "test(#X): unit, integration tests and demo dataset"
```

---

### Étape 5 — Validation locale pré-push dans le Worktree

Exécuter la validation directement depuis le worktree :
```powershell
Set-Location -Path .worktrees/ticket-<NUMERO>; node scripts/pre-push-check.js
```

Lancer les tests unitaires :
```powershell
Set-Location -Path .worktrees/ticket-<NUMERO>/frontend; npx ng test --watch=false --browsers=ChromeHeadless
Set-Location -Path .worktrees/ticket-<NUMERO>/backend; mvn test -q
```

Vérifier qu'il y a 0 erreur et 0 warning dans l'IDE pour les fichiers modifiés.

---

### Étape 6 — Push + Création de la Pull Request

Depuis le worktree :
```powershell
Set-Location -Path .worktrees/ticket-<NUMERO>; git push origin <branche>
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
  --body "## Résumé`n- ...`n`n## Lien ticket`nCloses #<NUMERO>`n`n## Tests`n- ...`n"
```

---

### Étape 7 — Revue Boost & Surveillance CI / SonarCloud

1. Audit approfondi du code (sécurité, conformité Grill-Me, zéro `any`, responsive).
2. Surveillance CI & SonarCloud (utiliser `openbar-ci-watch` si besoin).
3. Attendre que **tous les checks (Frontend, Backend, SonarCloud)** soient 100% au vert.
4. Traiter les suggestions éventuelles de `copilot-pull-request-reviewer`.

---

### Étape 8 — Synchronisation Anti-Conflit sur dev (Étape critique en parallèle)

> 💡 **Le piège du travail en parallèle :**  
> Pendant que vous développiez ce ticket, un autre agent dans une autre conversation a peut-être mergé son ticket sur `dev` !

Avant de fusionner la PR :
1. Vérifier si `origin/dev` a avancé :
```powershell
Set-Location -Path .worktrees/ticket-<NUMERO>; git fetch origin dev
Set-Location -Path .worktrees/ticket-<NUMERO>; git log HEAD..origin/dev --oneline
```

2. **Si `origin/dev` a de nouveaux commits :**
```powershell
Set-Location -Path .worktrees/ticket-<NUMERO>; git merge origin/dev
```
- **Si des conflits apparaissent** (souvent sur `fr.json`, `en.json` ou `demo_dataset.json`) :
  - Résoudre proprement les conflits en conservant à la fois les ajouts de l'autre ticket et les vôtres.
  - Valider avec `node scripts/pre-push-check.js`.
  - Committer la résolution : `git commit -m "chore: merge dev and resolve concurrent conflicts"`.
  - Repousser sur la branche : `git push origin <branche>`.
  - Attendre à nouveau les checks CI verts.

---

### Étape 9 — Merge de la Pull Request

Une fois tous les checks au vert :
```bash
mcp__plugin_github_github__merge_pull_request(
  pullNumber=<NUM>,
  merge_method="merge",
  commit_title="Merge feat/#X: <titre du ticket> → dev"
)
```
*(Toujours `merge_method="merge"`, jamais de squash).*

---

### Étape 10 — Nettoyage du Worktree & Synchronisation Board / KIs

Une fois la PR mergée :

**1. Supprimer le Worktree proprement :**
```bash
git worktree remove .worktrees/ticket-<NUMERO> --force
```

**2. Supprimer les branches locale et distante :**
```bash
git branch -D <branche>
git push origin --delete <branche>
git fetch --prune
```

**3. Clôturer le ticket sur le board (Done) & clore l'issue :**
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

**4. Mettre à jour les KIs (`openbar-ki-update`) :**
Mettre à jour `features-state.md` et `architecture.md` sur `dev` dans le dépôt principal.

---

## Récapitulatif : lancer un ticket en parallèle

Dans n'importe quelle nouvelle conversation :
> *"Traite le ticket #635 en parallèle avec le skill openbar-parallel-ticket"*

L'agent va :
1. Créer automatiquement `.worktrees/ticket-635`.
2. Lier les `node_modules` en une commande native.
3. Cadrer, coder, tester dans son espace isolé.
4. Gérer la synchronisation avec `dev` si d'autres PRs ont mergé.
5. Merger et supprimer son worktree sans laisser de traces.
