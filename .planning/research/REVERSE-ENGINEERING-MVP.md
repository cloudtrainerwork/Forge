# Reverse-Engineering Existing Apps Into Node Graphs (MVP)

## Goal

Define the minimum viable system that can take an existing application and produce a useful node/edge representation for planning, readiness, and execution tracking.

## MVP Outcome

Given a GitHub repo or local codebase, produce:

1. `nodes.md`: canonical node list (id, type, name, description, confidence)
2. `edges.md`: relationships between nodes (source, relation, target, confidence, evidence)
3. `gaps.md`: unresolved areas, ambiguous boundaries, manual review items
4. `summary.md`: architecture overview and suggested decomposition quality score

## What "Node Representation" Means

### Node Types (MVP)

- `SERVICE` (backend service/module)
- `API` (endpoint group/controller)
- `DATABASE` (schema/table/model)
- `SCREEN` (route/page/view)
- `COMPONENT` (frontend feature component)
- `INTEGRATION` (external system, queue, webhook, third-party API)
- `JOB` (background workers, schedulers)

### Edge Types (MVP)

- `CALLS`
- `DEPENDS_ON`
- `READS`
- `WRITES`
- `CONTAINS`
- `PUBLISHES_TO`
- `SUBSCRIBES_TO`

## MVP Architecture Options

## Option A: Single-Agent Pipeline (Recommended for MVP)

One orchestrator agent runs sequential stages:

1. Repo scan and tech detection
2. Static extraction (routes, modules, DB models, imports)
3. Heuristic graph assembly
4. Markdown report generation
5. Confidence scoring + review checklist

Pros:
- Fastest to build
- Lower coordination complexity
- Easier debugging

Cons:
- Slower on very large repos
- Less specialization

## Option B: Multi-Agent Pipeline (v2+)

Specialized agents run in parallel:

- `FrontendAgent`
- `BackendAgent`
- `DataAgent`
- `IntegrationAgent`
- `GraphMergeAgent` (dedupe + conflict resolution)
- `ReporterAgent`

Pros:
- Better scale and specialization
- Parallel throughput

Cons:
- Coordination overhead
- Harder merge/conflict management
- Higher implementation complexity

Recommendation: start with Option A, design interfaces so Option B can be added later.

## "Markdown Instead of Agents" Mode

Yes, you can do an MVP without autonomous agents.

### Markdown-First Workflow

1. Run deterministic scanners/scripts
2. Emit structured JSON intermediate artifacts
3. Render markdown outputs from templates
4. Human reviews and edits markdown
5. Optional agent only for summarization/refinement

This gives strong determinism and auditability with minimal AI risk.

## Execution Model: GitHub vs Local

## Run Directly From GitHub (CI)

Use GitHub Actions to run on push/PR:

- Checks out repo
- Runs extractor
- Publishes artifacts (`nodes.md`, `edges.md`, `gaps.md`)
- Optionally comments summary on PR

Best for:
- Continuous architecture visibility
- Team workflows and governance

Limitations:
- Secrets/network restrictions
- Runtime limits for very large repos

## Run Local

CLI command against local repo:

`forge-map analyze /path/to/repo --out ./architecture-report`

Best for:
- Fast iteration
- Access to private/internal repos
- Easier debugging and custom heuristics

Limitations:
- Less standardized execution
- Harder centralized governance

## MVP Recommendation

- Primary: local CLI
- Secondary: GitHub Action wrapper using same core engine

This avoids duplicate logic and supports both developer and governance workflows.

## Required Components

1. **Repo Ingestor**
   - Accept local path or Git URL
   - Detect monorepos/subprojects

2. **Language/Framework Detectors**
   - Node/TS, Python, Java, .NET (start with TS/JS first for MVP)

3. **Extractors**
   - Route extractor
   - Module/import dependency extractor
   - DB model/schema extractor
   - Queue/event integration extractor

4. **Graph Builder**
   - Node creation + dedupe
   - Edge inference
   - Confidence scoring

5. **Evidence Tracker**
   - Store source file + line references for each inferred node/edge

6. **Markdown Renderer**
   - Deterministic templates for all output docs

7. **Review Loop**
   - Mark uncertain items
   - Accept/merge/split/delete nodes manually

## Suggested MVP Data Contracts

### Node

- `id`
- `type`
- `name`
- `path_refs[]`
- `description`
- `confidence` (0.0-1.0)

### Edge

- `source_id`
- `relation`
- `target_id`
- `evidence_refs[]`
- `confidence` (0.0-1.0)

## Confidence Heuristics (MVP)

- High confidence:
  - Route definitions
  - Explicit imports
  - ORM schema relations
- Medium confidence:
  - Service boundaries inferred from folder naming
  - Event publisher/subscriber matching by naming
- Low confidence:
  - Cross-layer inferred dependencies without direct reference

## Security and Privacy

- Default local execution for private code
- Redact secrets from logs/output
- Optional allowlist for file paths
- No outbound calls unless explicitly enabled

## MVP Phases

## Phase 1 (1-2 weeks): Deterministic Mapper

- TS/JS support
- Nodes + edges JSON
- Markdown output generator
- Local CLI

## Phase 2 (1 week): Quality + Review

- Confidence scoring
- Ambiguity surfacing in `gaps.md`
- Manual override file (`overrides.yaml`)

## Phase 3 (1 week): GitHub Action

- CI wrapper
- PR comment summary
- Artifact upload

## Acceptance Criteria (MVP)

1. On a medium repo, generates node/edge markdown in under 5 minutes.
2. At least 80% of major services/routes/tables represented as nodes.
3. Each inferred edge includes evidence references.
4. `gaps.md` clearly flags uncertain areas for human correction.
5. Same engine runs both local CLI and GitHub Action.

## Practical Answer to "Kinds of Agents?"

- MVP: one orchestrator agent or no agent (script-first markdown pipeline).
- v2+: multi-agent specialization if repo size/complexity justifies it.

## Practical Answer to "GitHub or Local?"

- Build core logic for local first.
- Add GitHub runner as a thin wrapper.
- Keep outputs markdown so humans can review quickly and commit changes.

## Next Step: Generate Real FORGE Nodes + Visuals (80/20)

After markdown generation, move to direct FORGE ingestion with a pragmatic target: capture the most useful 80% of architecture with minimal friction.

### 80/20 Scope (Do First)

1. Generate nodes for: `SERVICE`, `API`, `DATABASE`, `SCREEN`, `INTEGRATION`
2. Generate edges for: `DEPENDS_ON`, `CALLS`, `READS`, `WRITES`
3. Import into FORGE as a new project snapshot (non-destructive)
4. Auto-layout graph for immediate readability
5. Tag uncertain nodes/edges with low-confidence marker for manual cleanup

Skip for initial release:
- Deep hierarchy reconstruction
- Perfect naming normalization
- Full event-bus inference
- Cross-repo dependency federation

### Ingestion Pipeline

1. `analyze` -> build intermediate graph JSON
2. `transform` -> map intermediate graph to FORGE node/edge payloads
3. `import` -> upsert nodes/edges into FORGE project
4. `layout` -> assign x/y positions for canvas render
5. `review` -> output unresolved/low-confidence set for manual correction

### Suggested Artifacts

- `graph.raw.json` (extractor output)
- `graph.forge.json` (FORGE-ready schema)
- `import-report.md` (created/updated/skipped counts + errors)

### Mapping Contract (Minimum)

FORGE node payload:
- `id`
- `title`
- `type`
- `description`
- `confidence` (custom metadata)
- `sourceRefs[]`

FORGE edge payload:
- `source`
- `target`
- `type`
- `confidence`
- `evidenceRefs[]`

### Visual Generation Strategy

For MVP visuals, use deterministic layout:
- Group by node type (horizontal lanes), then
- Force-directed refinement for edge readability
- Pin high-centrality nodes near center

This gives stable, useful first-pass diagrams without custom manual placement.

### Operational Mode

- Default: local command against a checked-out repo
- Optional: invoke from GitHub Action and push output to FORGE via API token

CLI shape:

`forge-map ingest --repo /path/to/repo --forge-project <id> --confidence-threshold 0.6`

### Acceptance Criteria for This Step

1. Imported graph renders in FORGE without manual JSON edits.
2. At least 80% of major architectural elements appear as nodes.
3. Low-confidence items are clearly flagged for review.
4. Re-running import updates existing nodes/edges idempotently.
5. End-to-end flow completes in under 10 minutes for a medium repo.

### Immediate Build Order

1. Define `graph.forge.json` schema.
2. Build transformer from markdown/JSON extraction output to FORGE payloads.
3. Build importer (create/update nodes, then edges).
4. Add auto-layout step.
5. Add import report and confidence review list.
