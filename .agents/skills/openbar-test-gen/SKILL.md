---
name: openbar-test-gen
description: |
  Générateur autonome de pyramide de tests pour OpenBar : tests unitaires Karma (frontend sans any) et JUnit 5 (backend), tests de non-régression, seeding des données de démo dans demo_dataset.json, et scénarios E2E Playwright.

  Quand utiliser ce skill:
  - "génère les tests pour X"
  - "test pyramid"
  - "crée les specs"
  - "génère les tests complets"
  - "ajoute les tests et le demo dataset"
  - Étape 4 obligatoire de openbar-ticket et openbar-fast-ticket
---

# Skill : openbar-test-gen

Génère automatiquement la pyramide de tests complète requise pour toute modification ou nouvelle fonctionnalité dans OpenBar :
1. **Tests Unitaires Frontend (Karma / Jasmine)**
2. **Tests Unitaires Backend (JUnit 5 + Mockito)**
3. **Tests de Non-Régression (Bugfixes)**
4. **Données de Démonstration & Seeding Plateforme (`demo_dataset.json`)**
5. **Tests End-to-End (Playwright)**

---

## 1. Tests Unitaires & Non-Régression Frontend (Karma)

### Emplacement & Règles Strictes
- **Chemin :** `frontend/src/test/` (miroir exact de `src/app/`, **jamais** colocalisé avec le composant).
- **Zéro `any` :** Tous les mocks, spies et fixtures doivent être explicitement typés (TypeScript strict).
- **Transloco :** Utiliser `TranslocoTestingModule` pour injecter les traductions sans warning.
- **Langue :** Toutes les descriptions de suites (`describe`), cas de tests (`it`), et commentaires doivent être rédigés en **anglais**.

### Matrice de Couverture Obligatoire
Pour chaque composant ou service testé :
1. **Cas Nominal :** Initialisation correcte, affichage des données reçues, émission d'événements.
2. **Cas d'Erreur :** Échec HTTP (400, 404, 500), réponse vide ou corrompue, gestion d'exception utilisateur.
3. **Cas Limites :** Listes vides, valeurs nulles/undefined, chaînes de caractères avec caractères spéciaux.
4. **Non-Régression :** Si un bug est corrigé, un test dédié reproduisant fidèlement le cas d'erreur initial et attestant de sa résolution.

---

## 2. Tests Unitaires & Intégration Backend (JUnit 5)

### Emplacement & Conventions
- **Chemin :** `backend/src/test/java/fr/openbar/...`
- **Unitaires Métier :** `@ExtendWith(MockitoExtension.class)` sur `XxxServiceTest`. Injecter les mocks avec `@Mock` et instancier le service sous test via `@InjectMocks`.
- **Contrôleurs REST :** `@WebMvcTest(XxxController.class)` avec MockMvc pour valider les codes HTTP, les validations de DTOs (`@Valid`), et la sécurité (`@PreAuthorize`).
- **Documentation :** JavaDoc en anglais sur chaque méthode de test expliquant l'intention métier.

---

## 3. Données de Démonstration & Seeding Plateforme (`demo_dataset.json`)

**Règle absolue :** Pour toute nouvelle entité ou capacité ajoutée, l'environnement de dev/staging doit être immédiatement testable sans configuration manuelle.

1. **Mettre à jour `backend/src/main/resources/data/demo_dataset.json`** :
   - Ajouter des objets d'exemples réalistes (prix, libellés en français et anglais, descriptions, associations avec les tables et articles existants).
2. **Mettre à jour `SampleDataSeederService.java`** :
   - Assurer l'insertion idempotente des nouvelles données au démarrage si la base est vide.
   - Prévoir des états variés (ex. un actif, un en attente, un archivé) pour visualiser directement tous les cas dans l'interface.

---

## 4. Tests End-to-End Frontend (Playwright)

### Emplacement & Bonnes Pratiques
- **Chemin :** `frontend/e2e/specs/`
- **Sélecteurs :** Utiliser systématiquement les attributs `data-testid` (`page.locator('[data-testid="..."]')`). Ne jamais cibler de sélecteurs CSS fragiles ou de textes bruts.
- **Scénarios Clés :**
  - Navigation vers l'écran ou module.
  - Interaction utilisateur (saisie formulaire, clic bouton, modal).
  - Validation du feedback visuel (toast de confirmation, badge d'état mis à jour).
  - Comportement lorsque le module est désactivé (ModuleGuard : redirection ou écran non accessible).

---

## 5. Validation Automatique

Après génération des tests, exécuter :

```bash
# Vérifier la compilation et les types
node scripts/pre-push-check.js

# Exécuter les tests frontend
cd frontend && npx ng test --watch=false --browsers=ChromeHeadless

# Exécuter les tests backend
cd backend && mvn test -q
```
