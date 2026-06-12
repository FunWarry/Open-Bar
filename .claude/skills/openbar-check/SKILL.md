# Skill : openbar-check

Vérifie que tout l'environnement est correctement installé et fonctionnel pour travailler sur le projet OpenBar avec Claude Code.

## Quand utiliser ce skill

- Début de session de travail sur OpenBar
- Après une réinstallation ou changement d'environnement
- Quand un outil semble ne pas fonctionner
- "Vérifie que tout est installé"
- "Check l'environnement"
- "Est-ce que les plugins sont bien configurés ?"

---

## Instructions — Procédure de vérification complète

Exécuter **chaque vérification dans l'ordre**, afficher le résultat ✅/❌/⚠️ pour chacune, puis produire un rapport de synthèse final.

---

### 1. RTK (Rust Token Killer)

```bash
rtk --version
```

- ✅ Affiche `rtk X.Y.Z`
- ❌ "command not found" → installer RTK ou vérifier le PATH
- ⚠️ Si `rtk gain` échoue, vérifier collision avec `reachingforthejack/rtk`

---

### 2. Plugin MCP GitHub

Appeler l'outil `mcp__plugin_github_github__get_me` (sans paramètres).

- ✅ Retourne `login: "FunWarry"` avec les infos du compte
- ❌ Erreur → le plugin MCP GitHub n'est pas chargé ou pas authentifié

Puis vérifier l'authentification `gh` CLI :

```bash
gh auth status
```

- ✅ `Logged in to github.com as FunWarry`
- ❌ "not logged in" → lancer `! gh auth login` ou `! gh auth refresh --scopes "read:project"`
- Vérifier que le scope `read:project` est bien présent (nécessaire pour le Kanban)

Tester l'accès au Project Board :

```bash
rtk gh api graphql -f query='{ user(login: "FunWarry") { projectV2(number: 3) { title items { totalCount } } } }'
```

- ✅ Retourne `title` et `totalCount` du board
- ❌ `INSUFFICIENT_SCOPES` → `! gh auth refresh --scopes "read:project"`
- ❌ Autre erreur → vérifier l'authentification

---

### 3. Plugin MCP Figma

Appeler l'outil `mcp__plugin_figma_figma__whoami` (sans paramètres).

- ✅ Retourne les infos du compte Figma connecté
- ❌ Erreur ou non disponible → le plugin MCP Figma n'est pas chargé

Puis tester l'accès au fichier OpenBar :

Appeler `mcp__plugin_figma_figma__get_metadata` avec `fileKey: "XSVwFk64kgtqgUN9n5qoMw"`.

- ✅ Retourne les métadonnées du fichier Figma OpenBar
- ❌ "Not found" ou "Forbidden" → vérifier les permissions Figma ou le token

---

### 4. Java et Maven (Backend)

```bash
java --version && mvn --version
```

- ✅ Java 22+ et Maven 3.x
- ❌ "command not found" → installer Java 22 (temurin/openJDK) et Maven 3.x
- ⚠️ Java < 22 → Spring Boot 3.3.3 peut ne pas fonctionner correctement

---

### 5. Docker (Base de données)

```bash
docker --version && docker compose version
```

- ✅ Docker 24+ et Docker Compose v2
- ❌ "command not found" → installer Docker Desktop

Vérifier que le conteneur PostgreSQL est actif :

```bash
docker ps --filter name=postgres
```

- ✅ Conteneur listé avec statut `Up`
- ⚠️ Conteneur arrêté → `cd backend/src/main/resources && docker compose up -d`
- ❌ Aucun conteneur → lancer `docker compose up -d` depuis `backend/src/main/resources/`

---

### 6. Node.js et npm (Frontend)

```bash
node --version && npm --version
```

- ✅ Node 18+ et npm 9+
- ❌ "command not found" → installer Node.js LTS via nvm ou nodejs.org

---

### 7. Angular CLI

```bash
npx ng version 2>/dev/null | head -5
```

- ✅ Angular CLI 19+
- ⚠️ Version < 19 → `npm install -g @angular/cli@latest`
- ❌ Non installé → `npm install -g @angular/cli`

---

### 8. Dépendances frontend installées

```bash
ls frontend/node_modules/.package-lock.json 2>/dev/null && echo "OK" || echo "MISSING"
```

- ✅ "OK" → node_modules présent
- ❌ "MISSING" → `cd frontend && npm install`

---

### 9. Ionic CLI

```bash
npx ionic --version 2>/dev/null || echo "NOT FOUND"
```

- ✅ Ionic CLI 7+
- ⚠️ Non installé globalement → OK si présent dans `node_modules` du projet frontend

---

### 10. Accès Git et remote

```bash
rtk git remote -v
```

- ✅ Affiche `origin https://github.com/FunWarry/Open-Bar.git`
- ❌ Pas de remote → `git remote add origin https://github.com/FunWarry/Open-Bar.git`

---

### 11. Skill openbar-dev disponible

Vérifier que le fichier skill existe :

```bash
ls .claude/skills/openbar-dev/SKILL.md && echo "OK"
```

- ✅ "OK"
- ❌ Fichier absent → le skill n'a pas été créé correctement

---

### 12. Backend accessible (optionnel — si déjà lancé)

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/test/health
```

- ✅ `200` → API backend opérationnelle
- `000` ou autre → backend non lancé (normal si pas encore démarré)

---

## Rapport de synthèse attendu

Après avoir exécuté toutes les vérifications, produire un tableau récapitulatif :

```
## Rapport environnement OpenBar

| Outil / Plugin         | Statut | Version / Note                     |
|------------------------|--------|------------------------------------|
| RTK                    | ✅     | rtk X.Y.Z                         |
| MCP GitHub             | ✅     | Connecté en tant que FunWarry      |
| gh CLI + scope project | ✅     | Authenticated, read:project OK     |
| Project Board          | ✅     | 75 items dans le board             |
| MCP Figma              | ✅     | Connecté, fichier OpenBar accessible|
| Java                   | ✅     | Java 22.x                         |
| Maven                  | ✅     | Maven 3.x.x                       |
| Docker                 | ✅     | Docker 24.x                       |
| PostgreSQL (Docker)    | ✅     | Conteneur actif                    |
| Node.js                | ✅     | v20.x                             |
| npm                    | ✅     | 10.x                              |
| Angular CLI            | ✅     | 19.x                              |
| node_modules frontend  | ✅     | Installés                         |
| Ionic CLI              | ✅     | 7.x                               |
| Git remote             | ✅     | FunWarry/Open-Bar                  |
| Skill openbar-dev      | ✅     | Présent                           |
| Backend (API)          | ⚠️     | Non lancé (optionnel)             |

Environnement : ✅ PRÊT — X/17 checks OK
```

Si un élément est ❌, fournir la commande exacte pour corriger le problème.
