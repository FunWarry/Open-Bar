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

### Les 10 Portes de Qualité Vérifiées

1. **Parité Transloco i18n (`fr.json` vs `en.json`)** :
   - Extrait récursivement toutes les clés de `frontend/src/assets/i18n/fr.json` et `en.json`.
   - Échoue immédiatement si une clé présente dans `fr.json` est absente de `en.json` (ou l'inverse).

2. **Absence Totale de `@SuppressWarnings`** :
   - Inspecte les fichiers Java et TypeScript modifiés (`git diff HEAD`).
   - Bloque tout commit/push si une annotation `@SuppressWarnings` est détectée (obligation de résoudre le problème sous-jacent).

3. **Tokens CSS & Zéro Couleur en Dur** :
   - Analyse les fichiers `.scss` et `.css` modifiés.
   - Interdit les codes hexadécimaux (`#1a1a2e`) et RGB en dur. Exige les tokens CSS globaux de `variables.css` (`var(--background-surface-1)`, `var(--primary)`, etc.).

4. **Règles Sonar CSS / SCSS (`css:S9449` & `css:S9440`)** :
   - Interdit `transition: all` et vérifie la présence de `@media (prefers-reduced-motion: reduce)` en cas d'animation.

5. **Complexité Cognitive TypeScript (`typescript:S3776 <= 15`)** :
   - Analyse l'AST TypeScript pour bloquer toute méthode dépassant le seuil de complexité cognitive de 15.

6. **Cohérence des Fins de Ligne (Zéro `CRLF`/`LF` Mixte)** :
   - Vérifie qu'aucun fichier modifié ne mélange `\r\n` et `\n`, ce qui corrompt les buffers incrémentaux LSP d'Eclipse JDT LS (`redhat.java`).

7. **Règles SonarLint Java sur Fichier Complet (`S9435`, `S6213`, `S2925`, `S2589`)** :
   - Analyse l'intégralité des fichiers `.java` modifiés (et pas uniquement les lignes du diff PR) pour détecter les conditions ternaires inversées (`S9435`), l'identifiant restreint `record` (`S6213`), `Thread.sleep` dans les tests (`S2925`) et les vérifications nulles redondantes (`S2589`).

8. **Zéro Erreur TypeScript (`npx tsc --noEmit`)** :
   - Exécute `npx tsc --noEmit` sur le frontend.

9. **Compilation Backend Java 22 / Spring Boot 4 (`mvn test-compile -q`)** :
   - Garantit que tous les DTOs, services, contrôleurs et tests compilent sans erreur.

10. **Inspection Directe des Diagnostics Live de l'IDE (`redhat.java` JDT LS & `SonarQube for IDE`)** :
    - Lit directement les journaux d'extensions d'Antigravity IDE (`%APPDATA%\Antigravity IDE\User\workspaceStorage\*\redhat.java\jdt_ws\.metadata\.log` et `%APPDATA%\Antigravity IDE\logs\*\window*\exthost\SonarSource.sonarlint-vscode\SonarQube for IDE.log`) afin que l'agent détecte systématiquement tout problème affiché dans l'onglet **Problems** de l'utilisateur.

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
