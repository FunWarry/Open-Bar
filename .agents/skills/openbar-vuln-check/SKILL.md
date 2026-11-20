---
name: openbar-vuln-check
description: |
  Récupère et synthétise le rapport des dépendances vulnérables détectées par IntelliJ IDEA (Package Checker / Mend.io) via le serveur MCP jetbrains_air_ide.

  Quand utiliser ce skill:
  - "rapport des dépendances vulnérables"
  - "dépendances vulnérables IDE"
  - "vulnérabilités backend / frontend"
  - "check vulns" / "scan vulnérabilités"
  - Vérifier l'onglet Problems -> Security -> Vulnerable Dependencies sans erreur de timeout
---

# Skill : openbar-vuln-check

Récupère rapidement et proprement la liste complète des dépendances vulnérables (`VulnerableLibrariesLocal`) affichées dans IntelliJ IDEA (**Problems → Security → Vulnerable Dependencies**, alimenté par Mend.io / Package Checker), sans tomber sur les timeouts de `get_file_problems`.

## Pourquoi passer par `lint_files` ?

- `get_file_problems` expire (`"timedOut": true`) sur les gros fichiers de build ou lockfiles (`backend/pom.xml`, `frontend/package-lock.json`).
- `lint_files` via `jetbrains_air_ide` (`execute_tool`) exécute directement les inspections IDE sur les manifestes et retourne immédiatement toutes les alertes `VulnerableLibrariesLocal` avec :
  - le statut **direct** (`"is vulnerable"`) vs **transitif** (`"Provides transitive vulnerable dependency"`),
  - les coordonnées exactes `maven:...` ou `npm:...`,
  - les identifiants `CVE-*` / `WS-*` et leurs scores CVSS,
  - le numéro de ligne du `<dependency>` dans `backend/pom.xml` ou de la dépendance dans `frontend/package.json`.

---

## Procédure d'extraction (2 étapes)

### 1. Interroger le serveur MCP `jetbrains_air_ide`

Appeler `call_mcp_tool` (`ServerName: "jetbrains_air_ide"`, `ToolName: "execute_tool"`) avec :

**Backend (`backend/pom.xml`) :**
```text
lint_files --files ["backend/pom.xml"] --min_severity warning
```

**Frontend (`frontend/package.json`) :**
```text
lint_files --files ["frontend/package.json"] --min_severity warning
```

> ⚠️ **Pièges à éviter :**
> - `--files` exige un tableau JSON strict (`["backend/pom.xml"]`), jamais une chaîne brute.
> - `--min_severity` accepte uniquement `warning`, `strong_warning` ou `error` (jamais `WEAK_WARNING`).
> - Ne pas inclure `frontend/package-lock.json` dans `--files` : le fichier (~550 Ko) provoque un timeout de l'inspection.

---

### 2. Agréger et dédupliquer les résultats

Dans `backend/pom.xml`, une même dépendance transitive vulnérable (ex. `spring-core`, `spring-beans`, `jackson-databind`) est signalée sur **chaque starter** qui l'importe.

Pour obtenir exactement le décompte unique de l'onglet **Vulnerable Dependencies** de l'IDE :

1. Filtrer les entrées dont `inspectionId == "VulnerableLibrariesLocal"`.
2. Extraire l'identifiant du package (`maven:group:artifact:version` ou `npm:name:version`).
3. Dédupliquer par package tout en conservant l'ensemble des dépendances parentes (`line` → `<groupId>:<artifactId>` dans `backend/pom.xml` ou clé dans `frontend/package.json`).
4. Extraire tous les identifiants `CVE-YYYY-NNNN` / `WS-YYYY-NNNN` et leur score CVSS.
5. Classer par score CVSS maximal décroissant :
   - **Critique** : `9.0 – 10.0` (badge rouge `H` dans IntelliJ)
   - **Élevée** : `7.0 – 8.9` (badge rouge `H` dans IntelliJ)
   - **Moyenne** : `4.0 – 6.9` (badge jaune `M` dans IntelliJ)
   - **Faible** : `< 4.0` (badge gris `L` dans IntelliJ)

#### Script rapide d'agrégation (si la sortie `lint_files` est sauvegardée dans un fichier JSON)

```python
import json, re, sys

report_path = sys.argv[1]  # ex: .../steps/<id>/output.txt
data = json.load(open(report_path, encoding="utf-8"))
pom_lines = open("backend/pom.xml", encoding="utf-8").read().splitlines()

def dep_at(line: int) -> str:
    block = "\n".join(pom_lines[line - 1 : line + 6])
    g = re.search(r"<groupId>(.*?)</groupId>", block)
    a = re.search(r"<artifactId>(.*?)</artifactId>", block)
    s = re.search(r"<scope>(.*?)</scope>", block)
    if not g or not a:
        return f"L{line}"
    scope = f" [{s.group(1)}]" if s else ""
    return f"{g.group(1)}:{a.group(1)}{scope} (L{line})"

by_lib = {}
for item in data.get("items", []):
    file_path = item.get("filePath", "")
    for prob in item.get("problems", []):
        if prob.get("inspectionId") != "VulnerableLibrariesLocal":
            continue
        desc = prob["description"]
        pkg = re.search(r"((?:maven|npm):[^\s]+)", desc).group(1)
        cves = re.findall(r"((?:CVE|WS)-\d{4}-\d+)\s+([0-9.]+)", desc)
        via = dep_at(prob["line"]) if "pom.xml" in file_path else f"{file_path}:L{prob['line']}"
        is_direct = "is vulnerable" in desc
        entry = by_lib.setdefault(pkg, {"cves": cves, "via": [], "direct": is_direct})
        if via not in entry["via"]:
            entry["via"].append(via)

rows = sorted(
    ((max(float(s) for _, s in info["cves"]), pkg, info) for pkg, info in by_lib.items()),
    key=lambda x: (-x[0], x[1]),
)

print(f"Total unique vulnerable dependencies: {len(rows)}")
for mx, pkg, info in rows:
    cves_str = ", ".join(f"{c} ({s})" for c, s in info["cves"])
    print(f"{mx:4.1f} | {pkg} | direct={info['direct']} | via={'; '.join(info['via'])} | {cves_str}")
```

---

## Format de sortie attendu

Présenter à l'utilisateur :
1. Le **nombre total** de dépendances vulnérables uniques (backend / frontend).
2. Des **tableaux groupés par sévérité** (Critique, Élevée, Moyenne, Faible) avec :
   - Dépendance vulnérable (`group:artifact:version`)
   - Directe ou transitive (avec lien cliquable vers la ligne concernée dans `backend/pom.xml` ou `frontend/package.json`)
   - Liste des CVE/WS et scores CVSS
3. Une **synthèse des causes racines** (ex : parent Spring Boot, overrides de propriétés Maven, dépendances en scope `test` uniquement).
