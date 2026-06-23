# Skill : openbar-ticket

Pipeline complet de traitement d'un ticket GitHub : branche dédiée → implémentation → PR → auto-critique → corrections → merge dans `dev`.

## Quand utiliser ce skill

**Toujours** — pour chaque ticket à implémenter, sans exception. Ce skill remplace la façon de travailler directement sur `dev`. Il est invoqué automatiquement au début de chaque ticket et définit la procédure complète à suivre.

---

## Pipeline — 7 étapes obligatoires

### Étape 1 — Lire le ticket et se synchroniser

```bash
# Lire les détails du ticket
gh issue view <NUMERO> --repo FunWarry/Open-Bar

# Se placer sur dev à jour
rtk git checkout dev
rtk git pull origin dev
```

- Identifier le **type** du ticket : `feat` · `fix` · `docs` · `chore` · `refactor`
- Identifier une **description courte** (2-4 mots, kebab-case, sans accent) pour nommer la branche
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

**Convention de nommage :** `<type>/#<numero>-<description-courte>`

Exemples :
```
feat/#119-plan-de-salle-konva
fix/#121-exceptions-metier
docs/#122-mise-a-jour-claude-md
chore/#109-maj-dependances
```

```bash
rtk git checkout -b feat/#<numero>-<description>
```

> Un ticket = une branche. Ne jamais implémenter plusieurs tickets non liés sur la même branche.

---

### Étape 3 — Implémenter

Suivre les conventions de `openbar-dev` (voir `SKILL.md`).

**Commits :** atomiques, en conventional commits référençant le ticket :

```bash
rtk git add <fichiers-concernés>
rtk git commit -m "feat(#X): description courte de ce qui est fait"
```

- Un commit par unité logique (pas de mega-commits fourre-tout)
- Les tests sont inclus dans la même branche, dans le même commit ou un commit séparé

---

### Étape 4 — Push + création PR vers `dev`

```bash
rtk git push origin <branche>
```

Créer la PR avec `gh` :

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

## Plan de test
- [ ] <test manuel 1>
- [ ] <test manuel 2>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

### Étape 5 — Auto-critique

Invoquer le skill `/code-review` sur le diff de la PR :

```
/code-review --effort medium
```

**Analyser les findings :**
- ✅ **Bug réel** (logique incorrecte, null safety, race condition, sécurité) → corriger
- ✅ **Nommage trompeur** ou **incohérence avec les conventions du projet** → corriger
- ⏭ **Style subjectif** sans impact → ignorer
- ⏭ **Refactoring hors scope** du ticket → créer un ticket séparé si pertinent

**Questions à se poser systématiquement :**
1. Le code compile sans erreur TypeScript ? (`rtk tsc --noEmit | grep <feature>`)
2. Les tests couvrent les cas nominaux ET les cas d'erreur ?
3. Les champs utilisés dans le template HTML correspondent au modèle TypeScript ?
4. Le service est-il bien injecté (pas de `any[]` non typé) ?
5. Les nouvelles méthodes respectent les conventions backend (injection constructeur, `@Transactional`) ?

---

### Étape 6 — Corrections et mise à jour de la PR

Pour chaque issue trouvée lors de l'auto-critique :

```bash
# Corriger le fichier
rtk git add <fichier>
rtk git commit -m "fix(#X): <description de la correction>"
rtk git push origin <branche>
```

La PR se met à jour automatiquement.

Répéter l'auto-critique si les corrections sont significatives.

---

### Étape 7 — Merge et clôture

Merger la PR dans `dev` :

```bash
# Via MCP GitHub (préféré)
mcp__plugin_github_github__merge_pull_request(
  pullNumber=<NUM>,
  merge_method="squash",  # pour un seul commit propre dans dev
  commit_title="feat(#X): <titre du ticket>"
)
```

Ou via CLI :
```bash
gh pr merge <NUM> --repo FunWarry/Open-Bar --squash --delete-branch
```

**Clôturer le ticket :**

```bash
# Passer en "Done" sur le board
rtk gh api graphql -f query='mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwHOBOlRss4Bac05"
    itemId: "<ITEM_ID>"
    fieldId: "PVTSSF_lAHOBOlRss4Bac05zhVUX3s"
    value: { singleSelectOptionId: "98236657" }
  }) { projectV2Item { id } }
}'

# Fermer l'issue GitHub
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

- [ ] Zéro erreur TypeScript dans les fichiers modifiés (`rtk tsc --noEmit`)
- [ ] Tests écrits pour les nouvelles méthodes (cas nominal + cas d'erreur)
- [ ] Aucun `any` non justifié dans les composants touchés
- [ ] Templates HTML cohérents avec les modèles TypeScript
- [ ] Commit message en conventional commits avec référence au ticket
- [ ] PR description complète (résumé, lien ticket, plan de test)
- [ ] Board GitHub mis à jour (In progress → Done)

---

## Cas particuliers

### Plusieurs petits tickets liés

Si 2-3 tickets sont fortement couplés (ex : #111 Cocktails + #112 Ingrédients — même pattern CRUD), ils peuvent partager une branche et une PR :

```
feat/#111-#112-crud-cocktails-ingredients
```

Mentionner `Closes #111` **et** `Closes #112` dans le corps de la PR.

### Ticket bloqué (dépendance Java manquante)

Si le ticket nécessite Java/Docker non disponibles dans la session :
1. Documenter le blocage en commentaire sur l'issue
2. Passer le ticket en "Backlog" (pas "In progress")
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
