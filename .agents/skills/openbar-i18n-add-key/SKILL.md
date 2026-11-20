---
name: openbar-i18n-add-key
description: |
  Ajout rigoureux et dédoublonné d'une clé de traduction dans les fichiers i18n d'OpenBar.
  Recherche d'abord les traductions existantes pour réutiliser au maximum (anti-duplication),
  vérifie que la clé est réellement consommée dans le code source (zéro clé inutile),
  ajoute en miroir dans fr.json et en.json, et valide par le script de vérification i18n.

  Quand utiliser ce skill:
  - "ajoute une clé de traduction"
  - "ajoute une traduction"
  - "nouvelle clé i18n"
  - "add translation key"
  - "traduire ce texte"
  - Lors de l'ajout d'un texte utilisateur dans un composant Angular
---

# Skill : openbar-i18n-add-key (Anti-Duplication & Safe Key Insertion)

Ce skill définit la procédure standard pour ajouter une clé de traduction dans OpenBar.

Il applique deux règles d'or impératives :
1. **Éviter la duplication & favoriser la réutilisation** : Si un terme existe déjà (notamment dans `COMMON.*`), il doit être réutilisé au lieu de créer une clé redondante.
2. **Zéro clé orpheline / inutile** : Une clé ne doit être ajoutée que si elle est **réellement consommée** dans le code (`*.html` ou `*.ts`). Ne jamais créer de clé "en avance".

---

## Workflow d'Ajout en 4 Phases

```
┌─────────────────────────┐
│ 1. Recherche Existence  │ ── Clé existante trouvée ──> Réutiliser directement ! (0 ajout)
│    node find-i18n.js    │
└───────────┬─────────────┘
            │ Aucune clé réutilisable
            ▼
┌─────────────────────────┐
│ 2. Usage Réel Code      │ ── Vérifier présence dans template/TS :
│    {{ 'KEY'|transloco }}│    Ne jamais créer de clé non référencée !
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 3. Insertion Paritaire  │ ── Insérer au bon namespace dans fr.json ET en.json
│    fr.json & en.json    │
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 4. Validation Outillage │ ── node scripts/verify-i18n-parity.js
│    Parité & Zéro Dead   │ ── npm run i18n:scan
└─────────────────────────┘
```

---

### Phase 1 — Recherche Anti-Duplication & Réutilisation

Avant de créer une nouvelle clé, effectuer **toujours** une recherche dans les dictionnaires existants :

```bash
# Rechercher par mot-clé français ou anglais
node scripts/find-i18n.js "Enregistrer"
node scripts/find-i18n.js "Cancel"
node scripts/find-i18n.js "Supprimer"

# Ou via npm dans frontend/
cd frontend && npm run i18n:find "Fermer"
```

#### Règles de Réutilisation Prioritaire :
- Si l'action est générique (enregistrer, annuler, fermer, modifier, supprimer, retour, valider, oui, non, etc.), utiliser systématiquement les tokens du namespace **`COMMON.*`** :
  - `COMMON.SAVE` ("Enregistrer" / "Save")
  - `COMMON.CANCEL` ("Annuler" / "Cancel")
  - `COMMON.CLOSE` ("Fermer" / "Close")
  - `COMMON.DELETE` ("Supprimer" / "Delete")
  - `COMMON.EDIT` ("Modifier" / "Edit")
  - `COMMON.CONFIRM` ("Confirmer" / "Confirm")
  - `COMMON.BACK` ("Retour" / "Back")
  - `COMMON.YES` ("Oui" / "Yes")
  - `COMMON.NO` ("Non" / "No")
- **Ne jamais créer** `MY_PAGE.BTN_SAVE` ou `MY_MODAL.CANCEL` si `COMMON.SAVE` ou `COMMON.CANCEL` répond au besoin.
- **Si une clé existante convient** : l'utiliser directement dans le template/TS. Le workflow s'arrête ici sans toucher aux fichiers JSON.

---

### Phase 2 — Vérification de l'Usage Réel dans le Code

Si aucune clé existante ne convient et qu'un ajout est indispensable :
1. Définir le nom de la clé en suivant la convention du domaine fonctionnel :
   - Format : `<NAMESPACE>.<SOUS_SECTION>.<IDENTIFIANT_CLE>` en majuscules snake_case (ex: `TABLES.SPLIT_MODAL.CUSTOM_SPLIT_HINT`).
2. Vérifier que la clé est **déjà écrite** ou **en cours d'intégration immédiate** dans le code source :
   - Dans le template : `{{ 'NAMESPACE.SUB.KEY' | transloco }}`
   - Ou dans le TypeScript : `this.translocoService.translate('NAMESPACE.SUB.KEY')`
   - Ou en token de table/bouton : `labelKey: 'NAMESPACE.SUB.KEY'`

> ⚠️ **Interdiction formelle** : Ne jamais ajouter une clé dans les fichiers JSON "pour plus tard" ou sans qu'elle ne soit rattachée à un composant actif. L'outil d'analyse statique la considérerait comme orpheline.

---

### Phase 3 — Insertion Paritaire dans `fr.json` et `en.json`

Ajouter la clé simultanément dans les deux fichiers :
1. `frontend/src/assets/i18n/fr.json` (texte en français)
2. `frontend/src/assets/i18n/en.json` (traduction équivalente en anglais)

#### Formatage Exigé :
- Structure JSON arborescente (nested).
- Indentation stricte à 2 espaces.
- Ponctuation et variables cohérentes (ex: `{{count}} article(s)` dans les deux langues).
- Termes de mixologie et de restauration traduits professionnellement.

**Exemple :**
Dans `fr.json` :
```json
  "RESERVATIONS": {
    "CONFIRMATION_NOTICE": "Votre table sera réservée pour {{duration}} minutes."
  }
```

Dans `en.json` :
```json
  "RESERVATIONS": {
    "CONFIRMATION_NOTICE": "Your table will be held for {{duration}} minutes."
  }
```

---

### Phase 4 — Validation Automatisée Immédiate

Dès l'insertion effectuée, lancer la double vérification :

```bash
# 1. Valider la parité 100% stricte entre langues
node scripts/verify-i18n-parity.js

# 2. Valider qu'aucune clé orpheline n'a été créée (la nouvelle clé doit être détectée comme utilisée)
cd frontend && npm run i18n:scan

# 3. Lancer la vérification pré-push globale
node scripts/pre-push-check.js
```

Si `npm run i18n:scan` signale la nouvelle clé comme inutilisée, c'est que l'appel dans le template/TS ne correspond pas exactement au nom de la clé (faute de frappe ou référence manquante). Corriger immédiatement.
