# FORGE — Functional Orchestration for Release-Grade Execution

Interactive prototype of the FORGE execution architecture platform.

## Three Prototypes

| Tab | What It Shows |
|-----|---------------|
| **Agentic Export** | Graph canvas with shovel-ready specs. Export to GSD, BMAD, GitHub Spec Kit, Claude Code, or generic markdown. |
| **Live Reconciliation** | Press ▶ Start to watch GSD/BMAD/SpecKit agents complete tasks. Completion signals flow back into the graph, updating readiness bars in real-time. |
| **Integration Architecture** | GitHub Action YAML, VS Code extension mockup, `.forge/manifest.json` schema, webhook API docs. |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run dev server (opens browser automatically)
npm run dev
```

That's it. Opens at `http://localhost:3000`.

## Build for Production

```bash
npm run build
npm run preview
```

The `dist/` folder is a static site — deploy anywhere (Netlify, Vercel, S3, GitHub Pages).

## Requirements

- Node.js 18+
- npm 9+

## Project Structure

```
forge-app/
├── index.html                          # Entry HTML
├── package.json                        # Dependencies + scripts
├── vite.config.js                      # Vite configuration
├── src/
│   ├── main.jsx                        # Tab shell wrapping all 3 prototypes
│   ├── forge-agentic-export.jsx        # Graph + Spec + Export system
│   ├── forge-reconciliation.jsx        # Live agent reconciliation simulation
│   └── forge-integration-architecture.jsx  # CI/CD + VS Code + API architecture
```

## Architecture Concepts

### Shovel-Ready Specs
Work nodes contain 6-dimension specifications (Requirements, Design, Frontend, Backend, Integration, Test) that must all be green before sprint entry. Modeled from real dev build packages.

### Agentic Export
Specs transform into framework-specific execution plans:
- **GSD**: Atomic XML plans, max 3 tasks each, wave-based parallel execution
- **BMAD**: Hyper-detailed dev stories with embedded architectural context
- **Spec Kit**: Constitution + Specification + Plan pipeline
- **Claude Code**: CLAUDE.md project context for sub-agent delegation
- **Generic**: Universal markdown for any AI coding tool

### Reconciliation Loop
Completion signals (git commits from AI agents) flow back through:
1. **GitHub Action** parses structured commit messages
2. **`.forge/manifest.json`** maps plan/task → node/dimension
3. **FORGE API** updates readiness + runs propagation rules
4. **VS Code Extension** displays live readiness in editor sidebar

No local agents required. The CI pipeline is the reconciliation agent.
