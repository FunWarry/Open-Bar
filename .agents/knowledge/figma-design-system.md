# OpenBar — Figma Design System

## Figma Access

- **fileKey**: `XSVwFk64kgtqgUN9n5qoMw`
- **8 pages** (audited)

| Page | ID | Content |
|------|----|---------|
| 🎨 Design System | `0:1` | All DS atomic tokens & components |
| 🍹 Vue Barman | `57:2` | 8 views (Bartender Kanban & Orders) |
| 🗺 Vue Manager | `57:3` | 7 views (Manager Analytics & Cockpit) |
| 👋 Vue Serveur | `57:4` | 4 views + 2 variants (Server Floor Plan & Orders) |
| Vue système commun | `522:3214` | 6 views (Login, Register, Profile, 404) |
| 💰 Facturation | `626:987` | Billing & Checkout flows |
| 📱 Vue Client QR Code | `636:987` | Public client ordering interface |
| 📋 Dev Handoff | `638:987` | Specifications & assets |

---

## Color Tokens

### `Theme` Collection (Dark / Light)

| Token | Dark | Usage |
|-------|------|-------|
| `Background/bg-0` | `#0f0f1a` | Global app background |
| `Background/bg-1` | `#151521` | Secondary background |
| `Background/surface-1` | `#1a1a2e` | Cards, panels |
| `Background/surface-2` | `#21263f` | Elevated surfaces |
| `Background/surface-3` | `#2a3050` | Borders, dividers |
| `Primary` | `#6c7fe8` | Primary actions & buttons |
| `Primary Strong` | `#5a68d6` | Primary hover / active state |
| `Primary Press` | `#4d5ac4` | Primary pressed state |
| `Primary Light` | `#aab4f3` | Muted / secondary primary |
| `Text/Primary` | `#eceefb` | High-contrast main text |
| `Text/Secondary` | `#a4add0` | Secondary descriptive text |
| `Text/Muted` | `#7e87a8` | Subtle / placeholder text |
| `Border/Medium` | `#2e3450` | Standard card / item borders |
| `Border/Strong` | `#232142` | High-emphasis borders |
| `Border/Light` | `#3a4682` | Subtle dividers |
| `Border/Selected` | `#7c3aed` | Selected active state |

### `Roles` Collection

| Role | Color |
|------|-------|
| `Admin` | `#9b8af2` |
| `Manager` | `#f0a33b` |
| `Serveur` | `#34c77b` |
| `Barman` | `#4fc3f7` |

### `OpenBar DS` Collection

| Group | Tokens |
|-------|--------|
| Order Status | `Waiting` `#f4a52a`, `InProgress` `#2ba8e8`, `Ready` `#2fbf6b`, `Served` `#6e7aa8`, `Canceled` `#e5604f`, `Prioritary` `#ffd700` |
| Table Status | `Free`, `Occupied`, `Reserved`, `InProgress`, `AwaitingPayment` |
| Stock Level | `Normal` `#2fbf6b`, `Low` `#f4a52a`, `Critical` `#e5604f` |
| Semantic | `Success`, `Warning`, `Danger`, `Info` |

**Spacing**: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40px  
**Radius**: SM 6px → PILL 999px

---

## Atomic Components (Figma IDs)

| Component | ID | Variants | Usage |
|-----------|----|----------|-------|
| `Avatar` | `120:8` | 4 roles | Colored user initial in footer |
| `StatusBadge` | `58:20` | 6 order statuses | Bartender kanban & order list |
| `RoleBadge` | `120:23` | 8 (4 roles × Folded) | Navbar role indicator |
| `NavItem` | `120:16` | 4 (State × Folded) | Sidebar navigation items |
| `ActionButton` | `374:210` | 24 (6 types × 4 states) | CTAs across the entire app |
| `FilterChip` | `132:86` | 2 (Active / Default) | Filters and tab controls |
| `TableNode` | `126:109` | 12 (Round/Square × 6 statuses) | Interactive 2D floor plan |
| `Toggle` | `534:910` | 2 (On / Off) | Settings & preference toggles |
| `CheckBox` | `426:2058` | 2 (Checked / Unchecked) | Forms |
| `Toast` | `536:928` | 4 (Success / Error / Warning / Info) | Dynamic feedback toasts |
| `InputField` | `535:942` | 4 (Default / Focus / Error / Disabled) | Reusable form fields |

---

## Composite Components

| Component | ID | Usage |
|-----------|----|-------|
| `NavBar` | `62:59` | Sidebar 64–220px (6 variants: role × compact) |
| `CommandeCard` | `61:90` | Bartender kanban card (8 variants) |
| `CommandeModal` | `437:377` | Order detail modal |
| `TableEditionSidePanel` | `495:2978` | Table detail & editor panel |
| `StatCard` | `199:189` | Manager analytics KPI card |
| `StockRow` | `133:133` | Ingredient stock row |
| `ProductCard` | `129:95` | Public client QR code product card |
