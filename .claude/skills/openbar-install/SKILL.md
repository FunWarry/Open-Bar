# Skill : openbar-install

Installe et initialise tout l'environnement nécessaire au projet OpenBar. Résout automatiquement tous les points ❌ détectés par `/openbar-check`.

## Quand utiliser ce skill

- "Installe l'environnement"
- "Setup le projet"
- "Initialise tout"
- "Prépare l'environnement OpenBar"
- "Répare l'environnement"
- Après un `/openbar-check` qui retourne des ❌

---

## Instructions — Procédure d'installation complète

**Première chose à faire** : détecter l'OS.

```bash
uname -s 2>/dev/null || echo "Windows"
```

- `Linux` → utiliser `apt` / `curl`
- `Darwin` → utiliser `brew`
- `Windows` (ou commande absente) → utiliser `winget` + PowerShell

Chaque étape est **idempotente** : vérifier d'abord si l'outil est présent avant d'installer.

---

### ÉTAPE 1 — RTK (Rust Token Killer)

⚠️ **Attention** : il existe deux outils nommés `rtk` sur crates.io — le bon est `rtk-ai/rtk` (Rust Token Killer), pas `reachingforthejack/rtk` (Rust Type Kit). Ne jamais utiliser `cargo install rtk` seul.

**Vérifier que le bon RTK est installé :**
```bash
rtk gain 2>&1 | head -2
```

- ✅ Affiche `No tracking data yet` ou des statistiques → bon RTK installé
- ❌ `unexpected argument 'gain'` → mauvais RTK installé, désinstaller d'abord :
  ```bash
  cargo uninstall rtk 2>/dev/null || true
  ```
- ❌ `command not found` → pas encore installé

**Installer le bon RTK selon l'OS :**

**Windows (PowerShell) — binaire précompilé, pas de Rust requis :**
```powershell
# Récupérer la dernière version
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

Vérifier que `$env:USERPROFILE\.local\bin` est dans le PATH (il doit l'être, c'est le répertoire `.local\bin` standard) :
```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
rtk --version
```

**macOS :**
```bash
brew install rtk-ai/tap/rtk 2>/dev/null || cargo install --git https://github.com/rtk-ai/rtk
```

**Linux :**
```bash
# Installer Rust si absent
command -v cargo >/dev/null 2>&1 || (curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && source "$HOME/.cargo/env")
cargo install --git https://github.com/rtk-ai/rtk
```

**Après installation — initialiser les hooks Claude Code :**
```bash
rtk init
```

---

### ÉTAPE 2 — gh CLI

**Vérifier :**
```bash
gh --version 2>&1 | head -1
```

- ✅ Présent → aller à la vérification d'auth
- ❌ Absent → installer selon l'OS :

**macOS :**
```bash
brew install gh
```

**Linux (Debian/Ubuntu) :**
```bash
type -p curl >/dev/null || (sudo apt update && sudo apt install curl -y)
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update && sudo apt install gh -y
```

**Windows (PowerShell) :**
```powershell
winget install --id GitHub.cli --silent --accept-package-agreements --accept-source-agreements
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
```

**Vérifier l'authentification :**
```bash
gh auth status 2>&1
```

- ✅ `Logged in to github.com as FunWarry` avec scope `read:project` → OK
- ✅ Connecté mais scope absent → `gh auth refresh --scopes "read:project"`
- ❌ Non authentifié → **action manuelle requise** (voir section en bas)

---

### ÉTAPE 3 — MCP GitHub

Le MCP GitHub se configure dans `claude_desktop_config.json` (pas via une UI). Les outils apparaissent comme `mcp__github__*`.

**Vérifier si déjà configuré :**

Sur Windows :
```powershell
$cfg = Get-Content "$env:APPDATA\Claude\claude_desktop_config.json" | ConvertFrom-Json
$cfg.mcpServers.github
```

Sur macOS/Linux :
```bash
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool | grep -A5 '"github"'
```

- ✅ Affiche l'URL `api.githubcopilot.com/mcp` → déjà configuré
- ❌ Absent → configurer :

**Récupérer le token gh :**
```bash
gh auth token
```

**Ajouter le serveur MCP dans `claude_desktop_config.json` :**

Lire le fichier actuel, ajouter la clé `mcpServers` (ou la compléter si elle existe déjà) :

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp",
      "headers": {
        "Authorization": "Bearer <token_de_gh_auth_token>"
      }
    }
  }
}
```

Chemin du fichier :
- Windows : `%APPDATA%\Claude\claude_desktop_config.json`
- macOS : `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux : `~/.config/Claude/claude_desktop_config.json`

**Mettre à jour les permissions dans `.claude/settings.local.json` :**

S'assurer que les permissions utilisent le nom `github` (pas `plugin_github_github`) :
```json
"mcp__github__get_me",
"mcp__github__search_repositories",
"mcp__github__list_issues",
"mcp__github__search_issues"
```

**⚠️ Redémarrer Claude Code** après modification du fichier de config pour que le serveur MCP soit chargé.

---

### ÉTAPE 4 — Maven

**Vérifier :**
```bash
mvn --version 2>&1 | head -1
```

- ✅ Maven 3.x → passer
- ❌ Absent → installer :

**macOS :** `brew install maven`

**Linux :** `sudo apt update && sudo apt install maven -y`

**Windows :**
```powershell
winget install --id Apache.Maven --silent --accept-package-agreements --accept-source-agreements
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
```

---

### ÉTAPE 5 — Node.js + npm

**Vérifier :**
```bash
node --version 2>&1 && npm --version 2>&1
```

- ✅ Node 18+ et npm 9+ → passer
- ❌ Absent → installer :

**macOS :** `brew install node@20`

**Linux :**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y
```

**Windows :**
```powershell
winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
```

---

### ÉTAPE 6 — Angular CLI + Ionic CLI

**Vérifier :**
```bash
npx ng version 2>/dev/null | head -3
npx ionic --version 2>/dev/null || echo "NOT FOUND"
```

- ✅ Angular CLI 19+ et Ionic CLI 7+ → passer
- ❌ Absent :

```bash
npm install -g @angular/cli @ionic/cli
```

Sur Linux avec erreur de permissions : `sudo npm install -g @angular/cli @ionic/cli`

---

### ÉTAPE 7 — Dépendances frontend (node_modules)

**Vérifier :**
```bash
test -f frontend/node_modules/.package-lock.json && echo "OK" || echo "MISSING"
```

- ✅ `OK` → passer
- ❌ `MISSING` :

```bash
cd frontend && npm install && cd ..
```

---

### ÉTAPE 8 — Vérification MCP Figma

Appeler `mcp__2d4adff4-71e4-47fa-b0a3-642a8b4b53f7__whoami` (sans paramètres).

- ✅ Retourne les infos de Mathéo → OK
- ❌ Erreur → plugin Figma non chargé, vérifier les settings Claude Code

---

## Rapport de fin d'installation

```
## Résultat installation OpenBar

| Étape                  | Statut | Note                                  |
|------------------------|--------|---------------------------------------|
| RTK                    | ✅     | rtk X.Y.Z (rtk-ai/rtk)               |
| gh CLI                 | ✅     | gh X.Y.Z                             |
| gh auth + read:project | ✅/⚠️  | Authentifié / Action manuelle requise |
| MCP GitHub             | ✅/⚠️  | Configuré / Redémarrage requis        |
| Maven                  | ✅     | Apache Maven 3.x.x                   |
| Node.js + npm          | ✅     | v20.x / 10.x                         |
| Angular CLI            | ✅     | 19.x                                 |
| Ionic CLI              | ✅     | 7.x                                  |
| node_modules frontend  | ✅     | Installés                            |
| MCP Figma              | ✅     | Connecté (Mathéo)                    |
```

---

## Actions manuelles (non automatisables)

### 1. Authentifier gh CLI (si non connecté)
```bash
gh auth login
gh auth refresh --scopes "read:project"
```

### 2. Redémarrer Claude Code après config MCP
Toute modification de `claude_desktop_config.json` nécessite un redémarrage complet de Claude Code pour être prise en compte.

### 3. Démarrer Docker Desktop (Windows / macOS)
Lancer depuis le menu Démarrer (Windows) ou Applications (macOS), attendre l'icône verte, puis :
```bash
docker compose -f backend/src/main/resources/docker-compose.yml up -d
```
Sur Linux : `sudo systemctl start docker`

### 4. Nouveau terminal après installation (Windows)
Sur Windows, les PATH mis à jour par `winget` ne sont visibles que dans un **nouveau** terminal. Ouvrir une nouvelle fenêtre PowerShell après installation de Node.js ou Maven.
