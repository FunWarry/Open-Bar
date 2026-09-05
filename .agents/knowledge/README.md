# OpenBar — Knowledge Base

This directory contains up-to-date context documents for the OpenBar project.
These files are **AI-agnostic markdown** — any AI assistant can read them directly.

They are the single source of truth for project state, updated after each merged PR.

---

## Files

| File | Last Updated | Contents |
|------|-------------|----------|
| [architecture.md](architecture.md) | July 28, 2026 | Stack, architecture patterns, data model, roles, WebSocket topics, known bugs |
| [features-state.md](features-state.md) | July 28, 2026 | Feature implementation table (Backend/Frontend/Tests), active tech debt, PR history |
| [conventions.md](conventions.md) | July 28, 2026 | Backend/frontend code conventions, naming rules, test structure, Git workflow |
| [figma-design-system.md](figma-design-system.md) | July 28, 2026 | Figma fileKey, 8 pages, 60+ component IDs, color tokens (hex values) |

---

## How to Use

**For AI assistants**: Read the relevant file(s) before generating code or making decisions.
- Starting a new feature? → Read `architecture.md` + `features-state.md`
- Writing code? → Read `conventions.md`
- Working on UI? → Read `figma-design-system.md`

**For developers**: Update these files after each PR merge using the `openbar-ki-update` skill/workflow.

---

## Update Workflow

After merging a PR:
1. Update `features-state.md` — mark implemented features ✅
2. Update `architecture.md` — if new entities, topics, or bugs resolved
3. Update `conventions.md` — if new patterns established
4. Commit: `docs: sync knowledge base — #<N> implemented`
