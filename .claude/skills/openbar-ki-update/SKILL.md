---
name: openbar-ki-update
description: |
  Met à jour les Knowledge Items (KIs) OpenBar après une PR mergée ou un changement majeur.
  Garantit que les KIs restent synchronisés avec l'état réel du projet pour éviter de rescanner
  le code à chaque session.

  Quand utiliser ce skill:
  - Après le merge d'une PR qui ajoute/modifie une feature
  - "Met à jour les KIs"
  - "Synchronise le contexte"
  - "La feature X est terminée, mets à jour les KIs"
  - Après la clôture d'un ticket (étape 10 du pipeline openbar-ticket)
---

# Skill : openbar-ki-update

Met à jour les Knowledge Items OpenBar pour qu'ils reflètent l'état réel du projet.
Les KIs sont la mémoire inter-sessions d'Antigravity — les garder à jour évite de rescanner
l'intégralité du projet à chaque nouvelle session.

## Localisation des KIs

```
C:\Users\mathe\.gemini\antigravity-ide\knowledge\
├── openbar-project\artifacts\architecture.md      ← Stack, architecture, bugs connus
├── openbar-features\artifacts\features-state.md   ← Tableau des features + dette technique
├── openbar-conventions\artifacts\conventions.md   ← Conventions code + workflow
└── openbar-figma\artifacts\design-system.md       ← Design system, tokens, composants Figma
```

---

## Procédure de mise à jour

### Étape 1 — Identifier ce qui a changé

Lire le résumé de la PR mergée ou demander à l'utilisateur :
- Quelle(s) feature(s) ont été implémentées ?
- Backend ✅ / Frontend ✅ / Tests ✅ ?
- Des bugs ont-ils été corrigés ?
- Des nouvelles décisions techniques ont-elles été prises ?

### Étape 2 — Mettre à jour `openbar-features\artifacts\features-state.md`

C'est le KI le plus souvent à mettre à jour. Modifier le tableau des features :

```
| Feature X | ✅ | ✅ | ✅ |  ← avant: ✅ | ❌ frontend | ✅
```

Ajouter l'entrée dans l'historique des résolutions si c'est une PR notable :
```markdown
| #XXX | Description de la feature résolue |
```

Si une dette technique a été corrigée, la supprimer du tableau "Dette Technique Active".

### Étape 3 — Mettre à jour `openbar-project\artifacts\architecture.md` si nécessaire

Modifier uniquement si :
- Une nouvelle entité JPA a été ajoutée → mettre à jour le schéma de données
- Un nouveau topic WebSocket a été créé → mettre à jour la liste des topics
- Une nouvelle décision architecturale a été prise → mettre à jour la section correspondante
- Un bug critique a été corrigé → le retirer des "Points d'Attention Critiques"
- La version d'une dépendance a changé → mettre à jour le tableau de stack

### Étape 4 — Mettre à jour `openbar-conventions\artifacts\conventions.md` si nécessaire

Modifier uniquement si :
- Une nouvelle convention de code a été établie
- Le workflow Git a changé
- Un nouveau pattern a été décidé (ex : nouveau patron de test)

### Étape 5 — Mettre à jour `openbar-figma\artifacts\design-system.md` si nécessaire

Modifier uniquement si :
- Un nouveau composant Figma a été ajouté avec son ID
- Des tokens couleur ont été mis à jour
- Une nouvelle page Figma a été créée

### Étape 6 — Mettre à jour les métadonnées

Mettre à jour `updated_at` dans le fichier `metadata.json` du KI modifié :
```json
{
  "updated_at": "YYYY-MM-DDTHH:MM:00Z"
}
```

---

## Mise à jour du tableau dans CLAUDE.md

**Obligatoire après chaque feature mergée** — le tableau "Features implémentées vs. manquantes" dans `CLAUDE.md` doit aussi être synchronisé :

```bash
# Localiser la ligne du ticket dans CLAUDE.md et mettre à jour les colonnes
# Puis committer directement sur dev :
git add CLAUDE.md
git commit -m "docs: mise à jour features — #<NUMERO> implémenté"
git push origin dev
```

---

## Exemple concret — Après merge PR #188 (Vue Client QR Code)

```markdown
# openbar-features/artifacts/features-state.md

## Tableau des Features
| Vue Client QR Code | ✅ | ✅ | ✅ |  ← était: ✅ | ❌ **à implémenter** | ✅

## Historique Résolutions
| #188 | Vue Client QR Code (interface publique mobile) |
```

```markdown
# openbar-project/artifacts/architecture.md

## Points d'Attention Critiques
# Supprimer la ligne "Vue Client QR Code manquante au frontend" si elle existe
```

---

## Checklist de fin de mise à jour

- [ ] `features-state.md` : tableau mis à jour (Backend ✅ / Frontend ✅ / Tests ✅)
- [ ] `features-state.md` : historique résolutions mis à jour si PR notable
- [ ] `features-state.md` : dette technique mise à jour si bug corrigé
- [ ] `architecture.md` : schéma données mis à jour si nouvelle entité
- [ ] `architecture.md` : topics WebSocket mis à jour si nouveau topic
- [ ] `architecture.md` : bugs connus mis à jour si bug corrigé
- [ ] `metadata.json` : `updated_at` mis à jour pour chaque KI modifié
- [ ] `CLAUDE.md` : tableau features mis à jour + commit sur `dev`
