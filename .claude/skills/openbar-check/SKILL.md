---
name: openbar-check
description: |
  Vérifie que tout l'environnement est correctement installé et fonctionnel pour travailler sur le projet OpenBar.

  Quand utiliser ce skill:
  - Début de session de travail sur OpenBar
  - Après une réinstallation ou changement d'environnement
  - Quand un outil semble ne pas fonctionner
  - "Vérifie que tout est installé"
  - "Check l'environnement"
  - "Est-ce que les plugins sont bien configurés ?"
---

# Skill : openbar-check

Vérifie que tout l'environnement est correctement installé et fonctionnel pour travailler sur le projet OpenBar avec Antigravity.

## Quand utiliser ce skill

- Début de session de travail sur OpenBar
- Après une réinstallation ou changement d'environnement
- "Vérifie que tout est installé" / "Check l'environnement"

---

## Instructions — Procédure de vérification complète

Exécuter **chaque vérification dans l'ordre**, afficher le résultat ✅/❌/⚠️ pour chacune, puis produire un rapport de synthèse final.

---

### 1. RTK (Rust Token Killer)

```powershell
rtk --version
```

- ✅ Affiche `rtk X.Y.Z`
- ❌ "command not found" → voir openbar-install

Vérifier que c'est le bon RTK (pas `reachingforthejack/rtk`) :
```powershell
rtk gain 2>&1 | Select-Object -First 2
```
- ✅ Affiche stats ou "No tracking data" → bon RTK
- ❌ "unexpected argument 'gain'" → mauvais RTK installé

---

### 2. Plugin MCP GitHub

Appeler le tool MCP `get_me` (sans paramètres).

- ✅ Retourne `login: "FunWarry"` → MCP GitHub opérationnel
- ❌ Erreur → MCP GitHub non configuré, voir openbar-install

Vérifier le scope `read:project` (nécessaire pour le board Kanban) :
```powershell
gh auth status
```
- ✅ `Logged in to github.com as FunWarry` avec `read:project`
- ❌ Scope absent → `gh auth refresh --scopes "read:project"`

Tester l'accès au Project Board :
```powershell
gh api graphql -f query='{ user(login: "FunWarry") { projectV2(number: 3) { title items { totalCount } } } }'
```
- ✅ Retourne `title` et `totalCount`
- ❌ `INSUFFICIENT_SCOPES` → `gh auth refresh --scopes "read:project"`

---

### 3. Plugin MCP Figma

Appeler le tool MCP `get_metadata` avec `fileKey: "XSVwFk64kgtqgUN9n5qoMw"`.

- ✅ Retourne les métadonnées du fichier Figma OpenBar → MCP Figma opérationnel
- ❌ Erreur → MCP Figma non configuré ou token invalide

---

### 4. Java 22 et Maven (Backend)

```powershell
java --version; mvn --version
```

- ✅ Java **22** et Maven 3.x
- ❌ Java absent → installer via SDKMAN : `sdk env install` (un `.sdkmanrc` est fourni)
- ⚠️ Java ≠ 22 (23, 24...) → **CRITIQUE** : Lombok 1.18.34 ne supporte pas JDK 23+, les `@Data` ne génèrent aucun getter/setter → cascade d'erreurs `cannot find symbol getXxx()`
- Utiliser SDKMAN pour épingler exactement Java 22 : `sdk use java 22.x.x-tem`

---

### 5. Docker + PostgreSQL (Base de données)

```powershell
docker --version; docker compose version
```

- ✅ Docker 24+ et Docker Compose v2
- ❌ Absent → installer Docker Desktop

Vérifier que le conteneur PostgreSQL est actif :
```powershell
docker ps --filter name=postgres
```
- ✅ Conteneur `Up`
- ⚠️ Arrêté → `cd backend/src/main/resources; docker compose up -d`
- ❌ Absent → `cd backend/src/main/resources; docker compose up -d`

---

### 6. Node.js 22+ et npm

```powershell
node --version; npm --version
```

- ✅ Node 22+ et npm 10+
- ❌ Absent → installer Node.js LTS via `winget install OpenJS.NodeJS.LTS`

---

### 7. Angular CLI 20+

```powershell
npx ng version 2>$null | Select-Object -First 5
```

- ✅ Angular CLI **20+**
- ⚠️ Version < 20 → `npm install -g @angular/cli@latest`
- ❌ Non installé → `npm install -g @angular/cli`

---

### 8. Dépendances frontend installées

```powershell
Test-Path "frontend/node_modules/.package-lock.json"
```

- ✅ `True` → node_modules présents
- ❌ `False` → `cd frontend; npm install`

---

### 9. Ionic CLI

```powershell
npx ionic --version 2>$null
```

- ✅ Ionic CLI 7+
- ⚠️ Non installé globalement → OK si présent dans `node_modules` du frontend

---

### 10. Git remote

```powershell
git remote -v
```

- ✅ Affiche `origin https://github.com/FunWarry/Open-Bar.git`
- ❌ Absent → `git remote add origin https://github.com/FunWarry/Open-Bar.git`

---

### 11. Knowledge Items OpenBar (Antigravity)

Vérifier que les KIs sont présents :
```powershell
Get-ChildItem "C:\Users\mathe\.gemini\antigravity-ide\knowledge" -Directory | Select-Object Name
```

- ✅ Présence de `openbar-project`, `openbar-features`, `openbar-conventions`, `openbar-figma`
- ❌ Absents → les KIs ont été supprimés, signaler à l'utilisateur pour les recréer

---

### 12. Backend accessible (optionnel — si déjà lancé)

```powershell
try { (Invoke-WebRequest "http://localhost:8080/api/test/health" -UseBasicParsing).StatusCode } catch { "non lancé" }
```

- ✅ `200` → API backend opérationnelle
- `non lancé` → normal si pas encore démarré

---

## Rapport de synthèse attendu

```
## Rapport environnement OpenBar — [DATE]

| Outil / Plugin         | Statut | Version / Note                      |
|------------------------|--------|-------------------------------------|
| RTK                    | ✅     | rtk X.Y.Z (rtk-ai/rtk)             |
| MCP GitHub             | ✅     | Connecté en tant que FunWarry       |
| gh CLI + read:project  | ✅     | Authenticated, scope OK             |
| Project Board          | ✅     | N items dans le board               |
| MCP Figma              | ✅     | Fichier OpenBar accessible          |
| Java                   | ✅     | Java 22.x (épinglé)                |
| Maven                  | ✅     | Maven 3.9.x                        |
| Docker                 | ✅     | Docker 24.x+                       |
| PostgreSQL (Docker)    | ✅     | Conteneur actif                     |
| Node.js                | ✅     | v22.x (LTS)                        |
| npm                    | ✅     | 10.x                               |
| Angular CLI            | ✅     | 20.x                               |
| node_modules frontend  | ✅     | Installés                          |
| Ionic CLI              | ✅     | 7.x+                               |
| Git remote             | ✅     | FunWarry/Open-Bar                   |
| KIs OpenBar            | ✅     | 4 KIs présents                     |
| Backend (API)          | ⚠️     | Non lancé (optionnel)              |

Environnement : ✅ PRÊT — 16/17 checks OK
```

Si un élément est ❌, fournir la commande exacte pour corriger.
Si plusieurs ❌ → recommander `/openbar-install`.
