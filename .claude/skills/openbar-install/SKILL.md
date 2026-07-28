---
name: openbar-install
description: |
  Installe et initialise tout l'environnement nécessaire au projet OpenBar. Résout automatiquement les problèmes d'environnement.

  Quand utiliser ce skill:
  - "Installe l'environnement"
  - "Setup le projet"
  - "Initialise tout"
  - "Prépare l'environnement OpenBar"
  - "Répare l'environnement"
  - Après un openbar-check qui retourne des erreurs
---

# Skill : openbar-install

Installe et initialise tout l'environnement nécessaire au projet OpenBar.
Résout automatiquement tous les points ❌ détectés par `/openbar-check`.

## Quand utiliser ce skill

- "Installe l'environnement" / "Setup le projet" / "Répare l'environnement"
- Après un `/openbar-check` qui retourne des ❌

---

## Instructions — Procédure d'installation complète

**OS cible : Windows (PowerShell)**. Ce projet est développé sur Windows.

Chaque étape est **idempotente** : vérifier si l'outil est présent avant d'installer.

---

### ÉTAPE 1 — RTK (Rust Token Killer)

⚠️ **Attention** : il existe deux outils nommés `rtk` sur crates.io — le bon est `rtk-ai/rtk`, pas `reachingforthejack/rtk`.

**Vérifier que le bon RTK est installé :**
```powershell
rtk gain 2>&1 | Select-Object -First 2
```

- ✅ Affiche stats ou "No tracking data" → bon RTK installé
- ❌ "unexpected argument 'gain'" → mauvais RTK, désinstaller d'abord :
  ```powershell
  cargo uninstall rtk
  ```
- ❌ "command not found" → pas encore installé

**Installer RTK (Windows — binaire précompilé, pas de Rust requis) :**
```powershell
$release = Invoke-RestMethod "https://api.github.com/repos/rtk-ai/rtk/releases/latest"
$asset = $release.assets | Where-Object { $_.name -like "*x86_64-pc-windows*" } | Select-Object -First 1
$dest = "$env:USERPROFILE\.local\bin"
New-Item -ItemType Directory -Force $dest | Out-Null
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile "$env:TEMP\rtk.zip"
Expand-Archive -Path "$env:TEMP\rtk.zip" -DestinationPath "$env:TEMP\rtk-extract" -Force
Copy-Item "$env:TEMP\rtk-extract\rtk.exe" -Destination "$dest\rtk.exe" -Force
Remove-Item "$env:TEMP\rtk.zip", "$env:TEMP\rtk-extract" -Recurse -Force
Write-Output "RTK installé dans $dest"
```

Vérifier le PATH (ajouter si nécessaire) :
```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
rtk --version
```

**Initialiser RTK :**
```powershell
rtk init
```

---

### ÉTAPE 2 — gh CLI + authentification

**Vérifier :**
```powershell
gh --version 2>&1 | Select-Object -First 1
```

- ✅ Présent → aller à la vérification d'auth
- ❌ Absent :
```powershell
winget install --id GitHub.cli --silent --accept-package-agreements --accept-source-agreements
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
```

**Vérifier l'authentification :**
```powershell
gh auth status 2>&1
```

- ✅ `Logged in to github.com as FunWarry` avec `read:project` → OK
- ⚠️ Connecté mais scope `read:project` absent :
  ```powershell
  gh auth refresh --scopes "read:project"
  ```
- ❌ Non authentifié → **action manuelle requise** :
  ```powershell
  gh auth login
  gh auth refresh --scopes "read:project"
  ```

---

### ÉTAPE 3 — Java 22 (SDKMAN recommandé)

⚠️ **Version exacte requise : Java 22**. Lombok 1.18.34 ne supporte pas les internes du compilateur JDK 23+.

**Vérifier :**
```powershell
java --version 2>&1 | Select-Object -First 1
```

Si Java 22 absent ou mauvaise version :

**Option A — SDKMAN (recommandé, un `.sdkmanrc` est fourni à la racine) :**
```bash
# Depuis Git Bash ou WSL
sdk env install   # installe et active automatiquement Java 22
```

**Option B — Temurin 22 via winget :**
```powershell
winget install --id EclipseAdoptium.Temurin.22.JDK --silent --accept-package-agreements --accept-source-agreements
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
java --version
```

---

### ÉTAPE 4 — Maven

**Vérifier :**
```powershell
mvn --version 2>&1 | Select-Object -First 1
```

- ✅ Maven 3.x → passer
- ❌ Absent :
```powershell
winget install --id Apache.Maven --silent --accept-package-agreements --accept-source-agreements
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
```

---

### ÉTAPE 5 — Docker Desktop + PostgreSQL

**Vérifier Docker :**
```powershell
docker --version 2>&1; docker compose version 2>&1
```

- ✅ Docker 24+ et Docker Compose v2 → vérifier PostgreSQL
- ❌ Absent → installer Docker Desktop depuis https://www.docker.com/products/docker-desktop/
  (winget : `winget install Docker.DockerDesktop`)

**Démarrer Docker Desktop** (si pas déjà démarré) puis :
```powershell
cd backend/src/main/resources; docker compose up -d; cd ../../../..
```

**Vérifier PostgreSQL :**
```powershell
docker ps --filter name=postgres
```
- ✅ Conteneur `Up` → OK
- ❌ Absent → `docker compose up -d` depuis `backend/src/main/resources/`

---

### ÉTAPE 6 — Node.js 22+ et npm

**Vérifier :**
```powershell
node --version 2>&1; npm --version 2>&1
```

- ✅ Node 22+ et npm 10+ → passer
- ❌ Absent :
```powershell
winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
```

⚠️ Sur Windows, le PATH mis à jour par `winget` n'est visible que dans un **nouveau** terminal.

---

### ÉTAPE 7 — Angular CLI 20+

**Vérifier :**
```powershell
npx ng version 2>$null | Select-Object -First 5
```

- ✅ Angular CLI 20+ → passer
- ❌ Absent ou version < 20 :
```powershell
npm install -g @angular/cli@latest
```

---

### ÉTAPE 8 — Dépendances frontend (node_modules)

**Vérifier :**
```powershell
Test-Path "frontend/node_modules/.package-lock.json"
```

- ✅ `True` → OK
- ❌ `False` :
```powershell
cd frontend; npm install; cd ..
```

---

### ÉTAPE 9 — Vérification JWT_SECRET

Le backend nécessite une variable d'environnement `JWT_SECRET` (≥ 32 caractères).

**Vérifier qu'un fichier `.env` existe dans le backend :**
```powershell
Test-Path "backend/.env"
```

- ✅ `True` → vérifier que `JWT_SECRET` y est défini
- ❌ `False` → créer depuis le template :
```powershell
Copy-Item "backend/.env.example" "backend/.env"
Write-Output "JWT_SECRET=$(openssl rand -base64 32)" | Out-File "backend/.env" -Encoding utf8
```

---

## Rapport de fin d'installation

```
## Résultat installation OpenBar

| Étape                   | Statut | Note                                   |
|-------------------------|--------|----------------------------------------|
| RTK                     | ✅     | rtk X.Y.Z (rtk-ai/rtk)                |
| gh CLI                  | ✅     | gh X.Y.Z                              |
| gh auth + read:project  | ✅/⚠️  | Authentifié / Action manuelle requise  |
| Java 22                 | ✅     | Temurin 22.x.x                        |
| Maven                   | ✅     | Apache Maven 3.x.x                    |
| Docker + PostgreSQL     | ✅     | Docker 24.x, conteneur actif           |
| Node.js + npm           | ✅     | v22.x / 10.x                          |
| Angular CLI             | ✅     | 20.x                                  |
| node_modules frontend   | ✅     | Installés                             |
| JWT_SECRET              | ✅     | backend/.env configuré                |
```

---

## Actions manuelles (non automatisables)

### 1. Authentifier gh CLI
```powershell
gh auth login
gh auth refresh --scopes "read:project"
```

### 2. Ouvrir un nouveau terminal après winget
Toute modification de PATH par `winget` n'est visible que dans un nouveau terminal PowerShell.

### 3. Démarrer Docker Desktop
Docker Desktop doit être lancé (icône verte dans la barre des tâches) avant `docker compose up`.

### 4. MCP GitHub — si non configuré
Récupérer le token `gh auth token` et l'ajouter dans la config Antigravity MCP.
