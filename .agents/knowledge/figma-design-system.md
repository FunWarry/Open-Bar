# OpenBar — Design System Figma

## Accès Figma

- **fileKey** : `XSVwFk64kgtqgUN9n5qoMw`
- **8 pages** (vérifié juillet 2026)

| Page | ID | Contenu |
|------|----|---------| 
| 🎨 Design System | `0:1` | Tous les composants DS |
| 🍹 Vue Barman | `57:2` | 8 vues |
| 🗺 Vue Manager | `57:3` | 7 vues |
| 👋 Vue Serveur | `57:4` | 4 vues + 2 variantes |
| Vue système commun | `522:3214` | 6 vues (Login, Register…) |
| 💰 Facturation | `626:987` | Non auditée |
| 📱 Vue Client QR Code | `636:987` | Interface client non-auth |
| 📋 Dev Handoff | `638:987` | Non auditée |

## Tokens Couleur

### Collection `Thème` (Dark/Light — Light est un placeholder)

| Token | Dark | Usage |
|-------|------|-------|
| `Background/bg-0` | `#0f0f1a` | Fond global |
| `Background/bg-1` | `#151521` | Fond secondaire |
| `Background/surface-1` | `#1a1a2e` | Cards, panels |
| `Background/surface-2` | `#21263f` | Éléments surélevés |
| `Background/surface-3` | `#2a3050` | Bordures, dividers |
| `Primary` | `#6c7fe8` | Actions primaires |
| `Primary Strong` | `#5a68d6` | Primary hover/actif |
| `Primary Press` | `#4d5ac4` | Primary pressed |
| `Primary Light` | `#aab4f3` | Primary atténué |
| `Text/Primary` | `#eceefb` | Texte principal |
| `Text/Secondary` | `#a4add0` | Texte secondaire |
| `Text/Muted` | `#7e87a8` | Texte tertiaire |
| `Border/Medium` | `#2e3450` | Bordures standard |
| `Border/Strong` | `#232142` | Bordures marquées |
| `Border/Light` | `#3a4682` | Bordures discrètes |
| `Border/Selected` | `#7c3aed` | État sélectionné |

### Collection `Rôles`

| Rôle | Couleur |
|------|---------|
| `Admin` | `#9b8af2` |
| `Manager` | `#f0a33b` |
| `Serveur` | `#34c77b` |
| `Barman` | `#4fc3f7` |

### Collection `OpenBar DS`

| Groupe | Tokens |
|--------|--------|
| Statut commande | `Waiting` `#f4a52a`, `InProgress` `#2ba8e8`, `Ready` `#2fbf6b`, `Served` `#6e7aa8`, `Canceled` `#e5604f`, `Prioritary` `#ffd700` |
| Statut table | `Free`, `Occupied`, `Reserved`, `InProgress`, `AwaitingPayment` |
| Niveau stock | `Normal` `#2fbf6b`, `Low` `#f4a52a`, `Critical` `#e5604f` |
| Sémantique | `Success`, `Warning`, `Danger`, `Info` |

**Space** : 4/8/12/16/20/24/32/40px  
**Radius** : SM 6px → PILL 999px

## Composants Atomiques (IDs Figma)

| Composant | ID | Variants | Usage |
|-----------|----|-----------| ------|
| `Avatar` | `120:8` | 4 rôles | Initiale colorée UserFooter |
| `StatusBadge` | `58:20` | 6 statuts commande | Kanban barman |
| `RoleBadge` | `120:23` | 8 (4 rôles × Folded) | Chip rôle navbar |
| `NavItem` | `120:16` | 4 (State × Folded) | Sidebar |
| `ActionButton` | `374:210` | 24 (6 types × 4 états) | CTA partout |
| `FilterChip` | `132:86` | 2 (Active/Default) | Filtres, tabs |
| `TableNode` | `126:109` | 12 (Round/Square × 6 statuts) | Plan de salle |
| `Toggle` | `534:910` | 2 (On/Off) | Settings |
| `CheckBox` | `426:2058` | 2 | Formulaires |
| `Toast` | `536:928` | 4 (Success/Error/Warning/Info) | Feedback |
| `InputField` | `535:942` | 4 (Default/Focus/Error/Disabled) | Formulaires |

## Composants Composites Clés

| Composant | ID | Usage |
|-----------|----| ------|
| `NavBar` | `62:59` | Sidebar 64–220px (6 variants rôle × compact) |
| `CommandeCard` | `61:90` | Carte kanban barman (8 variants) |
| `CommandeModal` | `437:377` | Modal détail barman |
| `TableEditionSidePanel` | `495:2978` | Panel détail table |
| `StatCard` | `199:189` | Dashboard manager |
| `StockRow` | `133:133` | Ligne stock |
| `ProductCard` | `129:95` | Carte produit QR client |
