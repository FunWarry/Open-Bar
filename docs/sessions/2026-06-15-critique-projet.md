# Critique du projet OpenBar — 15 juin 2026

> Analyse produite par Claude Opus 4.8 · Session du 2026-06-15
> Basée sur : CDC.md, README.md, CLAUDE.md, .github/instructions/.instructions.md, OpenBar-DS/, mémoire projet, git log

---

## Ce qui fonctionne bien

### Design & documentation — niveau professionnel

Le CDC fait 32 Ko de documentation structurée, les décisions techniques sont justifiées, la roadmap est en 4 phases réalistes. Pour un projet étudiant, c'est exceptionnellement rigoureux.

Le Figma est à un niveau industriel : 60+ composants, hiérarchie atomique/composite/écran respectée, tokens de couleur documentés, 6 pages cohérentes. La décision "design first" est la bonne approche pour ne pas implémenter sans savoir où on va.

Le backend est solide : pattern Controller → Service → Repository tenu, injection par constructeur, Lombok, `@Transactional`, audit logs — les conventions sont définies et visiblement respectées.

---

## Problèmes critiques

### 1. Le README est inutilisable — identité du projet brisée

Le fichier `README.md` est en réalité un **prompt CRAFT pour "NightShift POS"** (NestJS + Bootstrap 5 + micro-services Docker), une application complètement différente d'OpenBar. N'importe qui arrivant sur le repo GitHub voit un projet qui n'a aucun rapport avec le code actuel.

**Impact** : zéro onboarding possible, contributeur externe perdu, crédibilité du projet nulle à la première impression.

**Fix** : remplacer le README par une vraie description d'OpenBar avec les instructions de lancement, la stack, les captures d'écran.

---

### 2. Aucun code dans le repo Git

Le working tree de la branche courante ne contient que :
- `CDC.md`, `CLAUDE.md`, `README.md`
- `OpenBar-DS/` (design system HTML statique)
- `.claude/`, `.github/`

Le backend Spring Boot et le frontend Angular **ne sont pas dans ce repo**. Les commits Java sont dans l'historique mais visiblement dans une branche ou un état antérieur.

**Impact** : impossible de collaborer, de faire une review, de déployer. Le kanban GitHub pointe sur un repo sans code.

---

### 3. Sécurité — deux failles critiques non corrigées

| Bug | Gravité | État |
|-----|---------|------|
| Secret JWT hardcodé dans `application.yml` | Critique | Documenté, pas corrigé |
| WebSocket STOMP sans authentification | Critique | Documenté, pas corrigé |

Le second est le plus dangereux : n'importe quel visiteur peut s'abonner à `/topic/commandes` et voir toutes les commandes en temps réel, sans être connecté.

---

### 4. Frontend — décalage massif avec le backend

Le backend est à 100%, le frontend est à ~20% de fonctionnel. Concrètement :

- Services HTTP manquants pour la quasi-totalité des features
- WebSocketService vide — le cœur de valeur de l'app (temps réel) n'existe pas côté client
- Migration Angular Material → Ionic incomplète — l'UI est dans un état hybride incohérent
- Module Factures absent — le bar ne peut pas encaisser via l'app

Un backend sans frontend opérationnel ne produit aucune valeur utilisateur.

---

### 5. Zéro test backend

Aucun test unitaire ni d'intégration pour un cycle de vie commande en 6 états avec transitions conditionnelles. Le bug `dateLivraison` (set sur `PRET` au lieu de `LIVREE`) ne serait pas passé avec un seul test de cycle.

**Impact** : chaque refactoring ou ajout de feature est une régression potentielle invisible.

---

### 6. Pas de DTOs de sortie

Les entités JPA sont sérialisées directement. Risques :
- Boucles JSON infinies sur les relations bidirectionnelles
- Fuite de données : le hash du mot de passe est probablement sérialisé dans les réponses `User`
- Couplage fort : changer le modèle casse l'API

---

### 7. Pas de validation Bean côté backend

Aucun `@Valid` / `@NotNull` / `@Size` sur les DTOs d'entrée. N'importe quelle donnée malformée rentre dans le système et produit soit une exception 500 brute soit des données corrompues en base.

---

## Problèmes méthodologiques

### Le README est un prompt IA, pas une doc projet

Il y a une confusion entre "documents pour Claude" (CLAUDE.md, CDC.md, .instructions.md) et "documentation publique du projet" (README.md). Le README est lu par GitHub, par les recruteurs, par les collaborateurs — pas par Claude.

### Design System en deux endroits non synchronisés

Le DS existe à la fois dans Figma (source de vérité) et dans `OpenBar-DS/` (HTML/CSS statique). Si le Figma évolue, le HTML ne se met pas à jour. Il faudrait soit supprimer le HTML statique, soit l'accepter comme artefact figé en le datant.

### La décision "Ionic + Capacitor" est actée mais non amorcée

Ni `capacitor.config.ts`, ni configuration iOS/Android, ni `ionic.config.json`. La décision est documentée mais pas traduite en setup technique.

---

## Ce qui manque et qui bloque la valeur métier

| Feature | Pourquoi elle bloque |
|---------|---------------------|
| Déstockage automatique | Un bar sans stock réel décrémenté ne peut pas gérer les ruptures |
| Facturation frontend | Le bar ne peut pas encaisser via l'app |
| Notifications WebSocket frontend | La coordination serveur ↔ barman (la raison d'être de l'app) ne fonctionne pas |
| Plan de salle serveur | Le flux principal d'un serveur (voir tables → prendre commande) est inexistant |

---

## Résumé & priorités

Le projet a une **excellente conception** (CDC, Figma, architecture backend) et une **exécution incomplète**. Le ratio conception/code est déséquilibré : ~95% du design, ~20% du frontend opérationnel. Les failles de sécurité sont connues mais non corrigées. Le README sabote la première impression du projet.

**Priorité immédiate recommandée :**
1. Corriger le README (~30 min)
2. Committer le code backend+frontend dans le repo (~10 min)
3. Corriger le bug WebSocket sans auth + externaliser le secret JWT (~1h)
4. Brancher les services HTTP frontend sur le backend (débloque tout le reste)
