---
name: openbar-pre-push
description: |
  Validation pré-push ultra-rapide (TypeScript sans erreur, zéro problème IDE, parité i18n fr/en, zéro @SuppressWarnings, styles conformes CSS variables, compilation backend).

  Quand utiliser ce skill:
  - "pre-push"
  - "check pre-push"
  - "valide avant push"
  - "vérifie avant commit"
  - "lance les vérifications pré-push"
  - Étape 5 obligatoire de openbar-ticket et openbar-fast-ticket
---

# Skill : openbar-pre-push

Validation automatisée complète en local avant tout commit ou push git. Garantit l'absence totale de régressions, le respect de la règle **Zéro Problème IDE**, la parité i18n, et la propreté du code.

## Pourquoi ce skill est vital

Pousser du code avec des erreurs TypeScript, des clés i18n manquantes, ou des `@SuppressWarnings` fait échouer la CI et bloque l'équipe. Ce workflow exécute en ~10-15 secondes les 5 garde-fous essentiels en local.

---

## Exécution de la suite de validation

Lancer directement le script dédié à la racine du projet :

```bash
node scripts/pre-push-check.js
```

### Les 5 Portes de Qualité Vérifiées

1. **Parité Transloco i18n (`fr.json` vs `en.json`)** :
   - Extrait récursivement toutes les clés de `frontend/src/assets/i18n/fr.json` et `en.json`.
   - Échoue immédiatement si une clé présente dans `fr.json` est absente de `en.json` (ou l'inverse).

2. **Absence Totale de `@SuppressWarnings`** :
   - Inspecte les fichiers Java et TypeScript modifiés (`git diff HEAD`).
   - Bloque tout commit/push si une annotation `@SuppressWarnings` est détectée (obligation de résoudre le problème sous-jacent).

3. **Tokens CSS & Zéro Couleur en Dur** :
   - Analyse les fichiers `.scss` et `.css` modifiés.
   - Interdit les codes hexadécimaux (`#1a1a2e`) et RGB en dur. Exige les tokens CSS globaux de `variables.css` (`var(--background-surface-1)`, `var(--primary)`, etc.).

4. **Zéro Erreur TypeScript & Fenêtre "Problems" IDE Propre** :
   - Exécute `npx tsc --noEmit` sur le frontend.
   - S'assure que le compilateur TypeScript ne lève aucune erreur ni warning de type.

5. **Compilation Backend Java 22 / Spring Boot 4** :
   - Exécute `mvn test-compile -q` sur le backend.
   - Garantit que tous les DTOs, services, contrôleurs et tests compilent sans erreur.

---

## Protocole en cas d'échec d'une vérification

Si `node scripts/pre-push-check.js` retourne une erreur (code 1) :

| Erreur détectée | Action corrective immédiate |
|-----------------|-----------------------------|
| Clés i18n manquantes dans `en.json` | Ajouter les traductions anglaises correspondantes dans `frontend/src/assets/i18n/en.json`. |
| `@SuppressWarnings` trouvé | Supprimer l'annotation et refactoriser le code (typage DTO, génériques, cast approprié). |
| Couleur hexadécimale en dur dans le SCSS | Remplacer par la variable CSS correspondante depuis `frontend/src/theme/variables.css`. |
| Erreur TypeScript (`tsc`) | Corriger le type manquant, la signature de méthode ou le binding de template. |
| Erreur de compilation Maven | Corriger l'import, la signature Java ou l'incompatibilité de type dans `backend/`. |

Après correction, relancer `node scripts/pre-push-check.js` jusqu'à obtention de :
```
✔ ALL PRE-PUSH CHECKS PASSED: Ready to commit and push!
```
