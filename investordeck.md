# FORGE

**Functional Orchestration for Release-Grade Execution**

*The execution architecture platform that replaces Agile rituals with engineering systems.*

---

## The Problem

Software delivery is a $500B+ industry running on a 23-year-old methodology that was never designed for complex, multi-system engineering.

**Agile conflates planning with readiness.** A story in a sprint backlog says "we intend to do this." It says nothing about whether the API contract is finalized, the test environment is provisioned, the upstream team shipped their piece, or the integration spec is locked. Teams discover this mid-sprint and absorb the chaos as "velocity variance."

**Agile hides work behind ceremony.** Standups, refinement, and retros create an illusion of visibility. But the actual state -- "Screen 7 is blocked because the DTO merge isn't complete and the LUV service hasn't been updated" -- lives in someone's head or a Slack thread.

**Agile can't express scope risk at the release level.** When an executive asks "will we ship 1.1 on time?", the answer is a guess reconstructed from JIRA tickets. No tool computes probability from actual readiness states.

**Agile ignores structural overhead.** When a sprint has 1,000 hours with 700 production and 300 bugs/coordination, that 30% overhead is structural -- not a planning failure. Agile frameworks pretend it doesn't exist, then blame velocity.

**The result:** Engineering leaders maintain shadow spreadsheets, mind maps, and side-channel Slack threads to track what's actually happening. The project management tool is theater. The real work happens elsewhere.

---

## The Market Gap

The project management tool market (Jira, Linear, Asana, Monday, Shortcut) is a $10B+ segment, yet every player makes the same architectural mistake: they model work as **flat lists** or **rigid hierarchies**. Backlogs, boards, sprints, epics.

Real engineering work is a **directed graph** -- dependencies, integrations, test suites, services, screens, and devices all connected with typed relationships. Teams already think this way. They draw dependency graphs on whiteboards and in mind-mapping tools because no project management tool supports their actual mental model.

Meanwhile, AI coding agents (Cursor, Claude Code, GitHub Copilot, Windsurf) are accelerating code generation dramatically -- but they operate in a vacuum. No tool connects the work graph to the agent's execution context. Agents don't know what's ready, what's blocked, or what to build next.

FORGE sits at the intersection of these two gaps.

---

## What FORGE Does

FORGE is a cloud-native SaaS platform that replaces Agile project management with an execution architecture built on four pillars:

### 1. Graph-Based Work Modeling

Work is modeled as a directed acyclic graph -- nodes with typed relationships, not tickets in a backlog. Every unit of work (feature, service, screen, integration, test suite, device) is a node carrying multi-dimensional readiness state across six dimensions: Requirements, Design, Frontend, Backend, Integration, and Test.

Edges are typed: *blocks*, *requires*, *feeds-into*, *tested-by*, *deployed-with*. This lets teams query "show me everything transitively blocked by this node" -- the question they're actually asking every day but can't answer in any existing tool.

### 2. Shovel-Ready Specifications

Every node carries a structured specification modeled from real production build packages. Six mandatory sections (Requirements, Design, Frontend, Backend, Integration, Test Cases) must all reach completeness before a node can enter a sprint.

This isn't documentation for documentation's sake. Each section has concrete completeness criteria: no missing DTOs, no open integration questions, no undefined state transitions. The spec is the input contract that makes work actually executable -- not aspirationally "ready."

### 3. Sprint Execution as a System

Sprints are time-boxed compute cycles that pull from a ready queue. No grooming. No negotiation. If a node's six readiness dimensions aren't green, it doesn't enter the sprint. Overhead (bugs, coordination, environment work) is budgeted explicitly -- not hidden in velocity.

Release scope is probabilistic: every release has Committed nodes, Bubble nodes (likely but at risk), and Deferred nodes. Executives see probability bands computed from actual readiness states, not promises reconstructed from ticket counts.

### 4. Agentic Code Integration

This is FORGE's breakthrough differentiator and competitive moat.

Shovel-ready specs aren't just documentation -- they are the **input contract for AI coding agents**. FORGE transforms specifications into execution plans optimized for each agent framework's context engineering model:

- **GSD (Get Shit Done):** Atomic XML plans, max 3 tasks each, wave-based parallel execution
- **BMAD Method:** Hyper-detailed dev stories with embedded architectural context
- **GitHub Spec Kit:** Constitution + Specification + Plan pipeline
- **Claude Code:** CLAUDE.md project context with sub-agent delegation
- **Generic Markdown:** Universal format compatible with Cursor, Windsurf, Cline, Aider

FORGE doesn't pick an agent winner. It makes the specification the single source of truth and transforms it into whatever format the execution tool needs. Specs are the durable artifact; agent plans are ephemeral projections.

---

## The Closed Loop: Why This Matters

Every other tool stops at "export a spec." FORGE closes the loop.

When AI agents complete tasks, completion signals flow back into the graph through a reconciliation system:

**GitHub Action** (primary integration surface): Runs in CI where commits already flow. Parses structured commit messages, maps them to graph nodes via a version-controlled manifest, and updates readiness dimensions automatically.

**VS Code Extension** (developer visibility): Read-only sidebar showing live readiness, spec context for the current file, and dependency status. No local state to corrupt, no sync conflicts.

**Webhook API** (integration glue): REST endpoint for any CI system -- GitLab, Bitbucket, Jenkins. WebSocket for real-time updates.

The manifest (`.forge/manifest.json`) maps every exported plan/task to a graph node/dimension. When an agent completes a task, the system knows exactly which readiness bar to increment. When a node crosses a threshold, the graph propagates: blocked nodes get unblocked, bubble nodes get promoted, release probability recalculates.

**This means:** PR comments show graph impact alongside code changes ("This PR moves ePayment Frontend 50% to 70% and unblocks Loan Origination"). Code reviewers see release-level consequences at merge time. Executives get trustworthy probability views computed from verified code completions, not standup interpretations.

No local agents required. The CI pipeline is the reconciliation agent. Developer workflow is unchanged -- push code, graph updates.

---

## Agile vs. FORGE: Side-by-Side

| Dimension | Agile (Jira, Linear, etc.) | FORGE |
|-----------|---------------------------|-------|
| **Work model** | Flat backlog or rigid hierarchy | Directed acyclic graph with typed edges |
| **Readiness** | Single status field (To Do / In Progress / Done) | Six-dimension readiness state (Req, Design, FE, BE, Integration, Test) |
| **Sprint entry** | Human judgment in grooming meetings | Systemic: all dimensions must be green |
| **Estimation** | Story points (negotiated, unreliable) | Readiness state (measured, objective) |
| **Overhead** | Hidden in velocity; blamed as variance | First-class budget (explicit prod/overhead split) |
| **Release planning** | Guess from ticket counts | Probabilistic: Committed / Bubble / Deferred with computed confidence |
| **Dependencies** | Implicit or manually tracked | Native graph: query, traverse, propagate |
| **Executive view** | Status reports reconstructed from tickets | Real-time probability dashboard computed from readiness |
| **AI integration** | None | Bidirectional: specs export to agents, completions flow back to graph |
| **Spec quality** | Acceptance criteria (often vague) | Six-section structured spec with completeness enforcement |
| **Blocking visibility** | Someone mentions it in standup | Graph traversal: "what is transitively blocked by X?" |
| **Mid-sprint discovery** | Common; absorbed as sprint failure | Structurally prevented: incomplete specs can't enter sprint |

---

## Product Progression

### Phase 1: Minimum Lovable Product (Months 1-6)

**Core Platform**
- Graph Canvas: Zoomable infinite canvas where work is modeled as an interactive node graph
- Multi-dimensional readiness panels on every node
- Typed edges (blocks, requires, feeds-into, tested-by, deployed-with)
- Collapse/expand for executive vs. team views

**Sprint Execution Engine**
- Time window + capacity budget with explicit overhead allocation
- Ready-queue pull system (nodes enter sprint only when all dimensions are green)
- Bubble zone visibility for at-risk scope
- Live readiness heatmap (replaces burndown charts)

**Release Probability View**
- Named scope boundaries with Committed / Bubble / Deferred tiers
- Probability computed from readiness states and historical throughput
- Single executive dashboard

**Shovel-Ready Specifications**
- Six-section structured specs (Requirements, Design, Frontend, Backend, Integration, Test)
- Completeness enforcement: missing elements block sprint entry
- AI Readiness Agent that detects inconsistencies and predicts risks

### Phase 2: Agentic Integration (Months 6-12)

**Agentic Export System**
- Transform specs into framework-specific execution plans (GSD, BMAD, Spec Kit, Claude Code, generic)
- One-click export from any node's spec card

**Closed-Loop Reconciliation**
- GitHub Action for commit-based signal capture
- `.forge/manifest.json` for deterministic traceability
- Readiness propagation engine (threshold crossing triggers downstream updates)
- PR impact comments showing graph-level consequences

**Developer Surfaces**
- VS Code extension (read-only readiness sidebar)
- Webhook/REST API for any CI system
- WebSocket for real-time updates

### Phase 3: Intelligence Layer (Months 12-18)

**Predictive Analytics**
- Historical throughput modeling per team, per node type
- Sprint spillover prediction (integration nodes historically take 40% longer)
- Scope risk scoring for releases

**Auto-Reconciliation**
- File-path matching fallback when commit messages lack plan IDs
- Unreconciled signal triage dashboard
- Pattern learning from manual resolutions

**Marketplace**
- Custom node types and readiness dimensions
- Integration connectors (CI/CD, cloud providers, test frameworks)
- Team-contributed spec templates

### Phase 4: Platform (Months 18-24)

**Enterprise Features**
- Multi-org, multi-project graph with cross-project dependencies
- RBAC, SSO, audit logging
- Compliance and governance views

**API Platform**
- Public API for third-party integrations
- Graph query language for custom reporting
- Embedded views (FORGE widgets in other tools)

---

## Technical Architecture

**Presentation Layer:** React with Canvas/WebGL for the graph canvas. Detail panels, spec cards, executive dashboards.

**Application Layer:** Graph engine (DAG operations, cycle detection, dependency resolution), sprint scheduler (capacity planning, ready-queue management), AI agent service (readiness analysis, risk prediction), release calculator (probabilistic scope modeling).

**Domain Layer:** Node aggregate (work items with typed readiness dimensions), edge aggregate (typed relationships), sprint aggregate (time window + capacity + pull queue), release aggregate (scope boundary + confidence tiers).

**Infrastructure Layer:**
- Graph database (Neo4j or Neptune) for native graph storage
- PostgreSQL JSONB for spec cards, readiness history, audit logs
- Event bus (Kafka or EventBridge) for real-time readiness changes
- Auth and multi-tenancy (Auth0/WorkOS for org isolation, RBAC, SSO)

**Key Architecture Decision:** Graph-first storage is non-negotiable. Forcing dependency graphs into relational tables (like every Agile tool does) destroys the structure teams think in. FORGE stores work as a native graph with typed properties and relationship semantics. PostgreSQL JSONB handles the document-oriented data alongside the graph.

---

## Competitive Landscape

| Category | Players | FORGE Advantage |
|----------|---------|-----------------|
| Traditional PM | Jira, Asana, Monday | Flat lists can't model real dependencies; no readiness enforcement |
| Modern PM | Linear, Shortcut, Height | Better UX, same architectural mistake (backlogs, not graphs) |
| Graph/visual tools | Miro, FigJam, MindMeister | Visual but not stateful; no execution engine |
| AI-native PM | Notion AI, ClickUp AI | Bolt-on AI on top of flat data models; no agent integration |
| Spec-driven dev | GSD, BMAD, Spec Kit | Execution frameworks, not platforms; no graph, no reconciliation |

**FORGE's moat is the closed loop.** Any tool can export specs. Only FORGE maps agent completions back to a graph, propagates readiness, and gives executives verifiable release probability computed from code, not conversation.

---

## Business Model

**Pricing tiers:**

| Tier | Price | Target | Key Features |
|------|-------|--------|-------------|
| Team | $15/user/mo | Small teams (5-20) | Graph canvas, specs, sprint engine, 1 project |
| Business | $30/user/mo | Mid-market (20-200) | Agentic export, reconciliation, VS Code ext, unlimited projects |
| Enterprise | Custom | Large orgs (200+) | Multi-org graphs, SSO/SCIM, audit, SLAs, dedicated support |

**Revenue expansion:** Agentic integration usage (API calls for reconciliation), premium AI features (predictive analytics, auto-triage), marketplace commissions.

---

## Go-to-Market

**Beachhead:** Engineering teams already using mind maps, whiteboards, or spreadsheets to track dependencies alongside their Agile tools. These teams have the problem and know they have it.

**Entry wedge:** Free graph canvas (the "mind map that executes"). Teams model their current sprint's dependency graph, see the readiness view, and realize their Agile tool is the bottleneck. Conversion happens when they want sprint enforcement and release probability.

**Expansion:** Agentic integration is the land-and-expand trigger. Once one team connects their AI coding workflow to FORGE, adjacent teams adopt to see cross-team dependency status. Enterprise deals close when executives discover the release probability view.

**Community:** Spec templates, custom node types, and integration connectors create a flywheel. Teams contribute patterns from their domain (fintech, healthcare, e-commerce) that attract similar teams.

---

## The Ask

We're raising a seed round to build the MLP (Phase 1) and prove product-market fit with 20 design-partner teams.

**Use of funds:**
- Engineering team (4-5 engineers, 1 designer) to build the graph canvas, spec system, and sprint engine
- 6-month runway to reach GA with paying design partners
- Initial infrastructure (graph database, auth, multi-tenancy)

**Milestones:**
- Month 3: Private beta with graph canvas and readiness views
- Month 6: GA with sprint engine and spec enforcement
- Month 9: Agentic export (GSD, BMAD, Claude Code integration)
- Month 12: Closed-loop reconciliation with GitHub Action

---

## Why Now

Three forces are converging:

**AI coding agents are mainstream.** Cursor, Claude Code, and GitHub Copilot are in millions of developer workflows. But they operate without context -- they don't know what's ready to build, what's blocked, or what to build next. The tool that connects the work graph to the agent context wins.

**Agile fatigue is real.** SAFe backlash, #NoEstimates movement, and the "post-Agile" discourse are mainstream. Teams are looking for something better but haven't found it because every alternative is still built on the same backlog-and-board architecture.

**Graph technology is mature.** Neo4j, Amazon Neptune, and open-source alternatives have made graph databases production-ready and affordable. The infrastructure to build FORGE didn't exist 5 years ago at this cost and reliability.

The window is now. The team that builds the execution architecture for AI-augmented engineering will own the next decade of software delivery tooling.

---

*FORGE: Because the spec should be the source of truth, the graph should be the system of record, and the CI pipeline should be the reconciliation agent.*