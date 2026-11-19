---
name: openbar-create-ticket
description: |
  Pipeline et règles obligatoires pour créer et catégoriser des tickets (issues) GitHub sur le projet OpenBar.
  Attribution systématique et obligatoire de la Priorité (P0, P1, P2) et de la Taille (XS, S, M, L, XL),
  à la fois via les labels GitHub et via les champs personnalisés du Project Board V2 OpenBar.

  Quand utiliser ce skill:
  - "crée un ticket pour X"
  - "ajoute un ticket"
  - "crée les issues nécessaires"
  - "créer des tickets sur gh"
  - "ticket create" / "new issue"
---

# Skill : openbar-create-ticket

Règles et procédure standardisée pour la création d'issues GitHub sur le projet OpenBar.
Tout nouveau ticket créé sur le dépôt `FunWarry/Open-Bar` **DOIT OBLIGATOIREMENT** être qualifié en **Priorité** et en **Taille**, rattaché au **Project Board V2** et positionné dans le **Backlog**.

---

## 1. Référentiel des Priorités & Tailles (Obligatoire)

### 🎯 Priorité (Priority)

| Niveau | Label GitHub | Option ID Project V2 | Description & Périmètre |
|:---:|:---:|:---:|---|
| **P0** | `P0` | `79628723` | **Critique / Bloquant** : Cœur de caisse POS, encaissements, sécurité des transactions, conformité fiscale NF525, bugs bloquants en production ou sur mobile. |
| **P1** | `P1` | `0a877460` | **Haute Priorité** : Fonctionnalités métier majeures, stocks, KDS, fidélisation, hygiène HACCP, onboarding et gains de performance. |
| **P2** | `P2` | `da944a9c` | **Priorité Normale** : Gamification, animations de bar, TV déportées, intégrations IA avancées, confort visuel secondaire. |

---

### 📏 Taille (Size / T-Shirt Sizing)

| Taille | Label GitHub | Option ID Project V2 | Effort & Durée estimée |
|:---:|:---:|:---:|---|
| **XS** | `XS` | `6c6483d2` | **~1-2 heures** : Correction cosmétique mineure, typo, mise à jour doc ou RFC rapide. |
| **S** | `S` | `f784b110` | **~Demi-journée** : Composant UI isolé, bugfix ciblé ou script d'hygiène de code. |
| **M** | `M` | `7515a9f1` | **~1-2 jours** : Écran complet, service métier standard, refonte de page ou intégration API. |
| **L** | `L` | `817d0097` | **~3-5 jours** : Feature majeure transverse (backend + frontend + base de données + tests complets). |
| **XL** | `XL` | `db339eb2` | **> 1 semaine** : Épopée (Epic), nouveau sous-système architectural ou refonte structurelle. |

---

## 2. Structure Standardisée d'une Issue

Toute issue créée doit respecter scrupuleusement le format conventionnel :

### 2.1 Titre conventionnel (en Anglais)
`<type>(<scope>): <description courte et explicite>`
* *Exemples* :
  * `feat(pos): POS cashback and payment-to-cash movement workflow via Concert IP TPE`
  * `fix(pwa): resolve Android Chrome PWA installation failure with standard webmanifest`
  * `refactor(admin-users): complete UI redesign of admin users page using OpenBar design system`

### 2.2 Corps du ticket (Markdown en Anglais)
```markdown
## Problem & Strategic Context
Description claire du besoin utilisateur, du cas d'usage ou du bogue constaté.

## Acceptance Criteria
- [ ] Critère d'acceptation 1 testable
- [ ] Critère d'acceptation 2 testable
- [ ] Zero IDE problems, zero @SuppressWarnings, 100% Transloco FR/EN parity
- [ ] Full test pyramid (unit, non-regression, and E2E specs if user-facing)
```

---

## 3. Procédure CLI Automatisée d'Ajout

Pour créer un ticket et mettre à jour ses attributs en une seule passe :

### Étape 3.1 — Création de l'issue GitHub
```bash
gh issue create \
  --title "<type>(<scope>): <description>" \
  --body "<body_markdown>" \
  --label "<P0|P1|P2>,<XS|S|M|L|XL>,<labels_techniques>"
```

### Étape 3.2 — Rattachement au Project Board V2
```bash
gh project item-add 3 --owner FunWarry --url "<ISSUE_URL>"
```

### Étape 3.3 — Récupération de l'Item ID du ticket
```powershell
$itemId = ((gh project item-list 3 --owner FunWarry --format json --limit 400 | ConvertFrom-Json).items | Where-Object { $_.content.number -eq <ISSUE_NUMBER> }).id
```

### Étape 3.4 — Affectation de la Priorité & de la Taille sur le Board V2
```powershell
# Définir la Priorité
gh project item-edit --id $itemId --project-id "PVT_kwHOBOlRss4Bac05" --field-id "PVTSSF_lAHOBOlRss4Bac05zhVUX7w" --single-select-option-id "<P_OPTION_ID>"

# Définir la Taille
gh project item-edit --id $itemId --project-id "PVT_kwHOBOlRss4Bac05" --field-id "PVTSSF_lAHOBOlRss4Bac05zhVUX70" --single-select-option-id "<S_OPTION_ID>"
```

---

## 4. Checklist de validation

Avant de considérer la création d'un ticket comme terminée :
- [ ] Le titre suit la convention `<type>(<scope>): <description>` en anglais.
- [ ] La description comporte un contexte stratégique et des critères d'acceptation `[ ]`.
- [ ] Le label de priorité (`P0`, `P1` ou `P2`) est présent sur GitHub et sur le Project V2.
- [ ] Le label de taille (`XS`, `S`, `M`, `L` ou `XL`) est présent sur GitHub et sur le Project V2.
- [ ] Le ticket apparaît dans la vue Kanban du projet (`Backlog` par défaut).
