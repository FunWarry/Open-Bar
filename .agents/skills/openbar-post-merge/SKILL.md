---
name: openbar-post-merge
description: |
  Procédure complète post-merge après la fusion d'une Pull Request OpenBar : retour sur dev, nettoyage des branches locale et distante, clôture du ticket sur l'issue et le board Project V2 (Done), et synchronisation obligatoire de la Knowledge Base (features-state.md, architecture.md).

  Quand utiliser ce skill:
  - Après la fusion (merge) d'une PR GitHub
  - "Post-merge" / "Après merge" / "Finalise le merge de la PR #X"
  - "Clôture le ticket #X et synchronise les KIs"
  - Exécution de l'étape 10 du pipeline openbar-ticket
---

# Skill : openbar-post-merge

Procédure standardisée exécutée **immédiatement après chaque merge de Pull Request** dans la branche `dev`.

---

## 🎯 Objectif

Garantir la propreté du repository, la fermeture effective des issues/board GitHub, et maintenir une synchronisation stricte à 100% entre l'état réel du code et la Knowledge Base (`.agents/knowledge/`).

---

## 📋 Checklist des 6 Étapes Post-Merge

### Étape 1 — Synchronisation du workspace local sur `dev`

Retourner sur la branche `dev` et récupérer les derniers commits fusionnés sur origin :

```powershell
git checkout dev; git pull origin dev
```

---

### Étape 2 — Nettoyage des branches (Locale & Distante)

Supprimer la branche de la fonctionnalité devenue obsolète :

```powershell
# Supprimer la branche locale
git branch -D <nom-de-branche>

# Supprimer la branche distante (si non supprimée automatiquement par GitHub)
git push origin --delete <nom-de-branche>

# Nettoyer les références distantes obsolètes
git fetch --prune
```

---

### Étape 3 — Clôture du ticket & Board GitHub Project V2

1. **Passer l'élément du projet au statut "Done" (`98236657`)** :

```powershell
gh api graphql -f query='mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwHOBOlRss4Bac05"
    itemId: "<ITEM_ID>"
    fieldId: "PVTSSF_lAHOBOlRss4Bac05zhVUX3s"
    value: { singleSelectOptionId: "98236657" }
  }) { projectV2Item { id } }
}'
```

2. **Fermer l'issue GitHub associée** (si elle n'a pas été fermée automatiquement via `Closes #N` dans le body de la PR) :

```powershell
gh issue close <NUMERO_TICKET> --repo FunWarry/Open-Bar
```

---

### Étape 4 — Synchronisation de la Knowledge Base (`.agents/knowledge/`)

> ⚠️ **MANDATOIRE** : Les KIs sont la mémoire de l'agent. Un KI non mis à jour cause des régressions lors des sessions ultérieures.

1. **Fichier `features-state.md` (`.agents/knowledge/features-state.md`)** :
   - Mettre à jour le tableau des features (passer Backend, Frontend et Tests à `✅` pour la feature livrée).
   - Ajouter l'entrée dans la section **Historique Résolutions** :
     ```markdown
     | #PR (#ISSUE) | Description claire et concise de la feature / fix livré |
     ```
   - Si la PR résout une dette technique recensée dans la section "Dette Technique Active", la retirer ou la marquer résolue.

2. **Fichier `architecture.md` (`.agents/knowledge/architecture.md`)** *(si applicable)* :
   - Nouvelle entité / table BDD → Mettre à jour le modèle conceptuel de données.
   - Nouveau topic WebSocket → Ajouter à la liste des topics STOMP activement écoutés.
   - Nouveaux rôles / permissions ou contrats DTO majeurs → Mettre à jour la section architecture.
   - Bug connu résolu → Retirer des "Points d'Attention Critiques".

3. **Fichier `CLAUDE.md`** *(si présent à la racine)* :
   - Mettre à jour le tableau "Features implémentées vs. manquantes".

---

### Étape 5 — Commit et Push des KIs sur `dev`

Une fois les fichiers de documentation (`.agents/knowledge/` et/ou `CLAUDE.md`) mis à jour :

```powershell
git add .agents/knowledge/ CLAUDE.md
git commit -m "docs: sync Knowledge Items & features state after PR #<NUMERO_PR> merge"
git push origin dev
```

---

### Étape 6 — Validation finale de l'environnement

S'assurer que la branche `dev` locale est dans un état propre et fonctionnel :

```powershell
git status
```

---

## 🛠️ Référence des IDs GitHub Board

| Éléments | ID |
|---|---|
| Project ID | `PVT_kwHOBOlRss4Bac05` |
| Status Field ID | `PVTSSF_lAHOBOlRss4Bac05zhVUX3s` |

| Statut Option | ID |
|---|---|
| Backlog | `f75ad846` |
| In progress | `47fc9ee4` |
| In review | `df73e18b` |
| **Done** | **`98236657`** |
