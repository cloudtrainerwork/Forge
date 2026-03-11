import { useState, useEffect } from "react";

// ─── FORGE Method Documentation Site ───
// Modeled after BMAD docs (docs.bmad-method.org) in structure and depth

const COLORS = {
  bg: "#0c0d11", surface: "#13141b", surfaceHover: "#1a1b25",
  card: "#181924", border: "#252738", borderHover: "#3a3d56",
  text: "#e4e6f2", textMuted: "#8b8fa8", textDim: "#5a5e78",
  accent: "#f97316", accentDim: "#f9731630", accentLight: "#fb923c",
  green: "#22c55e", greenDim: "#22c55e20",
  blue: "#3b82f6", blueDim: "#3b82f620",
  purple: "#a855f7", purpleDim: "#a855f720",
  cyan: "#06b6d4", cyanDim: "#06b6d420",
  yellow: "#eab308", yellowDim: "#eab30820",
  red: "#ef4444", redDim: "#ef444420",
};

const NAV = [
  { id: "welcome", label: "Welcome", icon: "◆" },
  { id: "why", label: "Why FORGE", icon: "?" },
  { type: "section", label: "Core Concepts" },
  { id: "graph", label: "Graph-Based Work", icon: "◇" },
  { id: "readiness", label: "Multi-Dimensional Readiness", icon: "▦" },
  { id: "shovel", label: "Shovel-Ready Specs", icon: "▣" },
  { id: "sprints", label: "Sprint Execution", icon: "▷" },
  { id: "probability", label: "Probabilistic Scope", icon: "◎" },
  { type: "section", label: "AI Integration" },
  { id: "aitools", label: "AI-Powered Dev Tools", icon: "⚡" },
  { id: "export", label: "Spec Export System", icon: "↗" },
  { id: "closedloop", label: "Closed-Loop Reconciliation", icon: "⟲" },
  { type: "section", label: "Implementation" },
  { id: "github", label: "GitHub Action", icon: "⎔" },
  { id: "vscode", label: "VS Code Extension", icon: "⊞" },
  { id: "manifest", label: "Manifest Schema", icon: "{}" },
  { type: "section", label: "Reference" },
  { id: "comparison", label: "Agile vs FORGE", icon: "⇄" },
  { id: "glossary", label: "Glossary", icon: "A" },
  { id: "roadmap", label: "Roadmap", icon: "→" },
];

function Badge({ color, children }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color, background: color + "20", marginRight: 6 }}>{children}</span>
  );
}

function Callout({ type = "info", title, children }) {
  const colors = { info: COLORS.blue, warning: COLORS.yellow, tip: COLORS.green, danger: COLORS.red };
  const c = colors[type] || COLORS.blue;
  return (
    <div style={{ background: c + "08", border: `1px solid ${c}30`, borderLeft: `3px solid ${c}`, borderRadius: "0 6px 6px 0", padding: "12px 16px", marginBottom: 20 }}>
      {title && <div style={{ fontSize: 13, fontWeight: 700, color: c, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</div>}
      <div style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

function H1({ children }) { return <h1 style={{ fontSize: 28, fontWeight: 800, color: COLORS.text, margin: "0 0 8px", lineHeight: 1.2, fontFamily: "'Georgia', serif" }}>{children}</h1>; }
function H2({ children }) { return <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, margin: "32px 0 12px", paddingTop: 20, borderTop: `1px solid ${COLORS.border}`, fontFamily: "'Georgia', serif" }}>{children}</h2>; }
function H3({ children }) { return <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.accent, margin: "24px 0 8px" }}>{children}</h3>; }
function P({ children }) { return <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.7, margin: "0 0 16px" }}>{children}</p>; }

function Table({ headers, rows }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: 20 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>{headers.map((h, i) => <th key={i} style={{ textAlign: "left", padding: "8px 12px", borderBottom: `2px solid ${COLORS.border}`, color: COLORS.text, fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : COLORS.surface }}>
              {row.map((cell, j) => <td key={j} style={{ padding: "7px 12px", borderBottom: `1px solid ${COLORS.border}`, color: j === 0 ? COLORS.text : COLORS.textMuted }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── PAGE CONTENT ───

function WelcomePage() {
  return (<>
    <H1>The FORGE Method</H1>
    <P><strong style={{ color: COLORS.accent }}>Functional Orchestration for Release-Grade Execution</strong></P>
    <P>FORGE is an execution architecture methodology that replaces Agile's backlog-sprint-velocity model with a graph-based system built on five core practices. It provides specialized workflows, structured specifications, and integration with AI-powered development tools — adapting to your project's complexity whether you're shipping a feature or building an enterprise platform.</P>
    <Callout type="tip" title="New Here?">Start with <strong>Why FORGE</strong> to understand the problem, then read the five Core Concepts in order. Each builds on the last.</Callout>

    <H2>The Five Practices</H2>
    <Table headers={["Practice", "Replaces", "Core Idea"]}
      rows={[
        ["Graph-Based Work Modeling", "Flat backlogs", "Work as nodes in a directed graph with typed edges"],
        ["Multi-Dimensional Readiness", "Single status fields", "Six-axis state: Requirements, Design, FE, BE, Integration, Test"],
        ["Shovel-Ready Specifications", "Vague acceptance criteria", "Structured completeness gates before sprint entry"],
        ["Sprint Execution Windows", "Grooming + negotiation", "Pull from ready queue; overhead is first-class"],
        ["Closed-Loop Reconciliation", "Manual status updates", "Code commits flow back to graph via CI pipeline"],
      ]} />

    <H2>How FORGE Relates to Agile</H2>
    <P>FORGE doesn't reject Agile's values — working software, responding to change, individuals and interactions. It rejects the <em>information architecture</em> of the tools built to implement those values. Flat backlogs, single-status fields, and story-point estimation are structural limitations, not best practices. FORGE replaces the data model while preserving the intent.</P>

    <H2>How FORGE Relates to AI-Powered Development</H2>
    <P>Tools like Cursor, Claude Code, GitHub Copilot, and Windsurf are accelerating code generation dramatically. But they operate in a context vacuum — no tool connects the work graph to the development context. FORGE's shovel-ready specs become the input contract for these tools, and the closed-loop reconciliation system ensures the graph learns from code completions automatically.</P>

    <H2>What You'll Need</H2>
    <P>FORGE can be practiced with a whiteboard and a spreadsheet. No specific tooling is required. The methodology is tool-agnostic — you can implement it in Miro, Notion, a graph database, or purpose-built software. The five practices are the methodology; the tooling is the implementation.</P>
  </>);
}

function WhyPage() {
  return (<>
    <H1>Why FORGE</H1>
    <P>The core problem FORGE solves is the structural mismatch between how engineering teams actually work and how project management tools model that work.</P>

    <H2>The Shadow System</H2>
    <P>Every engineering leader maintains a parallel tracking system — a mind map, spreadsheet, Miro board, or Slack thread — alongside their Agile tool. This shadow system tracks dependencies, readiness states, integration contracts, and blocking relationships that the Agile tool can't express.</P>
    <P>The shadow system is the real status infrastructure. The Agile tool is theater.</P>

    <H2>Four Structural Failures</H2>
    <H3>1. Conflates Planning with Readiness</H3>
    <P>A story in a sprint backlog says "we intend to do this." It says nothing about whether the API contract is finalized, the test environment is provisioned, the upstream team shipped their piece, or the integration spec is locked.</P>
    <H3>2. Hides Work Behind Ceremony</H3>
    <P>Standups, refinement, and retros create an illusion of visibility. The actual state — "Screen 7 is blocked because the DTO merge isn't complete and the LUV service hasn't been updated" — lives in someone's head or a side channel.</P>
    <H3>3. Can't Express Scope Risk</H3>
    <P>When an executive asks "will we ship on time?", the answer is a guess reconstructed from ticket counts. No Agile tool computes probability from actual readiness states.</P>
    <H3>4. Ignores Structural Overhead</H3>
    <P>When a sprint has 700 production hours and 300 hours of bugs, coordination, and environment work, that 30% overhead is structural — not a planning failure. Agile frameworks pretend it doesn't exist, then blame "velocity variance."</P>

    <H2>The Architectural Mistake</H2>
    <P>Every project management tool — Jira, Linear, Asana, Monday, Shortcut — makes the same architectural mistake: they model work as flat lists or rigid hierarchies. Backlogs. Boards. Epic &gt; Story &gt; Task.</P>
    <P>But engineering work is a <strong>directed graph</strong>. Dependencies, integrations, test suites, services, and screens are all connected with typed relationships. Teams already think this way — they draw dependency graphs on whiteboards because their tools can't express them.</P>
    <P>FORGE fixes the data model.</P>
  </>);
}

function GraphPage() {
  return (<>
    <H1>Graph-Based Work Modeling</H1>
    <Badge color={COLORS.cyan}>Core Practice 1</Badge>
    <P>Every unit of work is a node in a directed acyclic graph with typed edges. Not tickets in a flat backlog.</P>

    <H2>Node Types</H2>
    <P>Nodes are typed to reflect the actual taxonomy of engineering work:</P>
    <Table headers={["Type", "Examples"]}
      rows={[
        ["Feature", "Loan Origination, Cash Advance, Refinance"],
        ["Service", "Payment Service, Auth Service, Notification Service"],
        ["Screen", "Application Screen, Dashboard, Settings Panel"],
        ["Integration", "E-Signature, Payment Gateway, SMS Provider"],
        ["Test Suite", "Regression Suite, UAT Scenarios, Load Tests"],
        ["Device", "Document Printer, Check Scanner, PIN Pad"],
        ["Environment", "Staging, UAT, Production"],
      ]} />
    <P>Custom node types can be added per team or domain. The system is schemaless — nodes are JSON documents with a required readiness dimensions map and typed edges.</P>

    <H2>Edge Types</H2>
    <P>Edges carry relationship semantics. This is the critical difference from parent-child hierarchies:</P>
    <Table headers={["Edge Type", "Meaning", "Example"]}
      rows={[
        ["blocks", "Target cannot start until source completes", "API Contract blocks Frontend Build"],
        ["requires", "Target needs source as a dependency", "E-Signature required by Loan Origination"],
        ["feeds-into", "Source output is input for target", "Cash Handling feeds into Loan Origination"],
        ["tested-by", "Source is validated by target test suite", "Payment Service tested-by Regression Suite"],
        ["deployed-with", "Source and target must deploy together", "API Gateway deployed-with Auth Service"],
        ["contains", "Hierarchical grouping (parent-child)", "Loan Origination contains Screen 7"],
      ]} />

    <H2>What the Graph Enables</H2>
    <P>With work modeled as a graph, you can ask questions a backlog can never answer:</P>
    <P><strong style={{ color: COLORS.text }}>"What's transitively blocked by this node?"</strong> — graph traversal shows every downstream node affected by a single dependency.</P>
    <P><strong style={{ color: COLORS.text }}>"If this node goes green, what gets unblocked?"</strong> — propagation logic reveals cascade effects across teams.</P>
    <P><strong style={{ color: COLORS.text }}>"Show me everything required by three or more features"</strong> — shared dependency analysis identifies critical-path integrations.</P>

    <Callout type="info" title="Key Architecture Decision">The graph database (Neo4j, Amazon Neptune, or similar) is the primary store — not a view layer on top of relational tables. Forcing dependency graphs into SQL tables destroys the structure teams think in. PostgreSQL JSONB handles document-oriented data (spec cards, history) alongside the graph.</Callout>
  </>);
}

function ReadinessPage() {
  return (<>
    <H1>Multi-Dimensional Readiness</H1>
    <Badge color={COLORS.green}>Core Practice 2</Badge>
    <P>Every node carries readiness state across six dimensions — not a single status field like "To Do / In Progress / Done."</P>

    <H2>The Six Dimensions</H2>
    <Table headers={["Dimension", "What It Measures", "Green When"]}
      rows={[
        ["Requirements", "Goal, preconditions, business flows, business rules", "All rules documented, no ambiguity"],
        ["Design", "Screen inventory, state enumerations, UX flows", "All screens identified, states defined"],
        ["Frontend", "Components, patterns (MVP/MV), state machines", "Components specified with interaction models"],
        ["Backend", "Interfaces, DTOs, service contracts, endpoints", "All contracts defined, DTOs complete"],
        ["Integration", "Data flows, external endpoints, open questions", "All questions answered, flows mapped"],
        ["Test", "Enumerated scenarios with expected results", "All scenarios written, no gaps"],
      ]} />

    <H2>Readiness vs. Estimation</H2>
    <P><strong>Story points are a negotiation.</strong> Two developers can argue about whether a feature is 5 points or 8 points, and neither is wrong because the unit is meaningless.</P>
    <P><strong>Readiness is a measurement.</strong> Either the DTO definitions exist or they don't. Either the integration questions have answers or they don't. There's nothing to negotiate.</P>

    <Callout type="tip" title="Try This Monday">Pick your riskiest feature. Score it across the six dimensions as a percentage. If your team says it's "almost done" but Integration is at 20%, you now know exactly where the risk lives — and it's not where the burndown chart is pointing.</Callout>

    <H2>Readiness Propagation</H2>
    <P>When a node's readiness changes, the graph can propagate effects:</P>
    <P>• When a node crosses a configurable threshold (e.g., 80% overall), downstream nodes that depend on it via <code>requires</code> edges can be automatically unblocked.</P>
    <P>• When all dependencies of a "Bubble" scope node go green, the node can be auto-promoted to "Committed."</P>
    <P>• Release probability recalculates in real-time as readiness states change across the graph.</P>
  </>);
}

function ShovelPage() {
  return (<>
    <H1>Shovel-Ready Specifications</H1>
    <Badge color={COLORS.blue}>Core Practice 3</Badge>
    <P>Every node carries a structured specification across six mandatory sections. If any section has missing elements or open questions, the node cannot enter a sprint. The system enforces this — not human discipline.</P>

    <H2>The Six Sections</H2>
    <H3>1. Requirements</H3>
    <P>Goal statement, preconditions, happy-path and error-path flows, and enumerated business rules. Every rule is numbered and testable. No vague language like "the system should handle errors gracefully."</P>
    <H3>2. Design</H3>
    <P>Screen inventory with state enumerations. Every screen the user will see, every state it can be in, every transition between states. State machines are explicit, not implied.</P>
    <H3>3. Frontend</H3>
    <P>Component definitions with MVP (Model-View-Presenter) or MV (Model-View) pattern designations. Props, events, state management approach. Not just "build a form" — the form's structure, validation rules, and interaction model.</P>
    <H3>4. Backend</H3>
    <P>Service interfaces with full DTO (Data Transfer Object) definitions. Not just endpoint names — the request shape, response shape, error codes, and contract version. Every field typed and documented.</P>
    <H3>5. Integration</H3>
    <P>Data flow diagrams with sequence relationships, external endpoint specifications, and — critically — an explicit list of open questions. This section has a completeness rule: if any open questions exist, the node is blocked from sprint entry.</P>
    <H3>6. Test Cases</H3>
    <P>Enumerated test scenarios with expected results. Not "test the happy path" — scenario 1 through scenario N, each with preconditions, steps, and expected outcomes. The ePayment spec template has 47 enumerated test cases.</P>

    <H2>Why "Shovel-Ready"</H2>
    <P>The term comes from infrastructure: you can't break ground until permits, surveys, environmental reviews, and engineering plans are all complete. Not "in progress." Complete.</P>
    <P>Shovel-ready specs change <em>when</em> the hard work happens. Instead of discovering complexity mid-sprint, you resolve it before sprint entry. The sprint becomes an execution window, not a discovery process.</P>

    <Callout type="warning" title="Mid-Sprint Discovery">The #1 cause of sprint spillover is mid-sprint discovery: realizing on day 4 that the API contract isn't finalized, the test environment doesn't exist, or the integration dependency is two sprints away. Shovel-ready specs structurally prevent this by gating sprint entry on completeness.</Callout>

    <H2>Specs as Input Contracts</H2>
    <P>In an AI-powered development workflow, shovel-ready specs take on a second critical function: they are the input contract for AI-powered development tools. A Jira ticket has a title, description, and acceptance criteria — four fields. A shovel-ready spec has hundreds of structured data points. The spec is what the tool needs to generate correct code on the first pass.</P>
  </>);
}

function SprintsPage() {
  return (<>
    <H1>Sprint Execution Windows</H1>
    <Badge color={COLORS.purple}>Core Practice 4</Badge>
    <P>Sprints are time-boxed execution windows that pull from a ready queue. No grooming. No negotiation. If a node's readiness dimensions aren't green, it doesn't enter.</P>

    <H2>How It Works</H2>
    <P>A sprint is defined by two things: a time window and a capacity budget.</P>
    <P>The capacity budget has explicit allocations for production work, bugs/defects, coordination overhead, and environment/infrastructure work. This is not hidden in "velocity" — it's a first-class budget line. If your team historically runs 70% production / 30% overhead, that's budgeted upfront.</P>
    <P>The sprint engine pulls nodes from the graph where readiness equals green across all required dimensions. Nodes that are close but not complete are visible as "Bubble" scope — likely to enter but at risk.</P>

    <H2>What's Eliminated</H2>
    <Table headers={["Agile Ceremony", "FORGE Replacement"]}
      rows={[
        ["Sprint Planning / Grooming", "Not needed — readiness gates determine what enters"],
        ["Story Point Estimation", "Not needed — readiness is measured, not negotiated"],
        ["Velocity Tracking", "Replaced by readiness throughput (dimensions completed per sprint)"],
        ["Burndown Charts", "Replaced by live readiness heatmaps"],
        ["Status Updates", "Replaced by graph state (updated by code commits)"],
      ]} />

    <H2>Overhead as First-Class</H2>
    <P>Every sprint in every team has structural overhead: bugs from previous sprints, coordination meetings, environment provisioning, regression testing, code reviews, deployment preparation. Agile treats this as velocity variance. FORGE treats it as physics.</P>
    <P>When a sprint has 1,000 available hours with 700 production and 300 overhead, that 30% is budgeted explicitly. Teams stop feeling guilty about "not hitting velocity" because the overhead was never production capacity in the first place.</P>
  </>);
}

function ProbabilityPage() {
  return (<>
    <H1>Probabilistic Scope Management</H1>
    <Badge color={COLORS.yellow}>Core Practice 5</Badge>
    <P>Every release has three tiers of scope — not a flat list of tickets with a deadline.</P>

    <H2>Confidence Tiers</H2>
    <Table headers={["Tier", "Meaning", "Executive Translation"]}
      rows={[
        ["Committed", "Will ship. All dependencies identified, readiness tracking.", "\"This is in the release.\""],
        ["Bubble", "Likely but at risk. Readiness is progressing but not guaranteed.", "\"We're targeting this but it could slip.\""],
        ["Deferred", "Explicitly not in this release. Named and visible.", "\"This is planned for a future release.\""],
      ]} />

    <H2>Release Probability</H2>
    <P>The system computes release probability from actual readiness states across all Committed and Bubble nodes. This is not a feeling or a standup interpretation — it's a mathematical function of how many dimensions are green, how many are blocked, and what the historical completion rate looks like for similar nodes.</P>
    <P>When an executive asks "will we ship 1.1 on time?", the answer is a computed confidence band: "Release 1.1 is at 73% probability. Committed scope is solid. Two Bubble nodes are at risk due to integration dependencies that are currently at 40% readiness."</P>

    <Callout type="info" title="Executive-Grade Decision Clarity">The release probability view replaces status reports reconstructed from ticket counts. Executives see a single dashboard with probability bands computed from verified readiness states — not from someone's interpretation of a standup conversation.</Callout>
  </>);
}

function AIToolsPage() {
  return (<>
    <H1>AI-Powered Development Tools</H1>
    <P>Tools like Cursor, Claude Code, GitHub Copilot, Windsurf, Cline, and Aider are transforming how code gets written. FORGE is designed to integrate with these tools bidirectionally — not as an afterthought, but as a core architectural capability.</P>

    <H2>The Specification Gap</H2>
    <P>AI-powered development tools have a fundamental constraint: context. They operate within a context window — a fixed amount of information they can hold and reason about. Give them too little context and they hallucinate architecture. Give them too much and important details get buried.</P>
    <P>A Jira ticket provides: a title, a description, and maybe some acceptance criteria. A shovel-ready spec provides: 14 business rules, component definitions with state machines, interface contracts with DTOs, data flow diagrams, and 47 test cases. The distance between these two is the specification gap.</P>

    <H2>Closing the Gap</H2>
    <P>FORGE's shovel-ready specs close the specification gap by providing the structured, comprehensive context these tools need to generate correct code. The spec isn't just documentation — it's the input contract that makes AI-powered code generation reliable instead of hopeful.</P>
    <P>Different tools need different formats. FORGE transforms the spec into whatever format the execution tool requires — the spec is the durable artifact; the tool-specific plan is an ephemeral projection.</P>

    <Callout type="warning" title="Not Vibe Coding">This is not "vibe coding." At enterprise scale, AI-powered development tools need structured specifications, not conversational prompts. The distinction matters: a prompt says "build a payment form." A shovel-ready spec says "build a payment form with these 6 components, this state machine, these DTOs, these validation rules, and these 12 test cases."</Callout>
  </>);
}

function ExportPage() {
  return (<>
    <H1>Spec Export System</H1>
    <P>FORGE transforms shovel-ready specs into execution plans optimized for each tool's context engineering model. Five export targets are supported:</P>

    <H2>Export Targets</H2>
    <H3>GSD (Get Shit Done)</H3>
    <P>Atomic XML plans with max 3 tasks each. Wave-based parallel execution. Fresh 200K sub-context per plan. Prevents context rot through aggressive atomicity.</P>
    <H3>BMAD Method</H3>
    <P>Hyper-detailed dev stories with embedded architectural context, acceptance criteria, and implementation guidance. Multi-agent persona flow: Analyst → PM → Architect → Scrum Master → Dev.</P>
    <H3>GitHub Spec Kit</H3>
    <P>Constitution + Specification + Plan pipeline. Agent-agnostic format that works with any AI-powered development tool. Structured markdown with research docs and implementation tasks.</P>
    <H3>Claude Code (CLAUDE.md)</H3>
    <P>Direct Claude Code format with project context file, sub-agent delegation, permission-aware task breakdown, and TDD-friendly structure.</P>
    <H3>Generic Markdown</H3>
    <P>Universal spec-driven format compatible with any tool — Cursor, Windsurf, Cline, Aider, or manual development. No framework lock-in.</P>

    <Callout type="tip" title="Framework Agnostic">FORGE doesn't pick a winner. The specification is the single source of truth. Export plans are ephemeral projections — transformations of the spec into whatever format the execution tool needs. Teams can switch tools without losing the spec.</Callout>
  </>);
}

function ClosedLoopPage() {
  return (<>
    <H1>Closed-Loop Reconciliation</H1>
    <P>This is FORGE's breakthrough capability. When AI-powered development tools complete tasks, completion signals flow back into the graph — readiness dimensions update, dependencies unblock, and release probability recalculates automatically.</P>

    <H2>The Three-Part System</H2>
    <H3>1. Signal Capture</H3>
    <P>Each tool framework emits completion signals differently. GSD writes state files and makes atomic commits with structured messages (e.g., <code>feat(PLAN-0102): CreditCardPaymentControl state machine</code>). BMAD marks stories complete. Spec Kit moves tasks through its pipeline. The reconciliation system watches via git hooks, file watchers, or CI pipeline triggers.</P>

    <H3>2. Traceability Mapping</H3>
    <P>FORGE generates a <code>.forge/manifest.json</code> alongside exported plans. This manifest maps every <code>plan_id</code> + <code>task_id</code> to a specific <code>node_id</code> + <code>dimension</code> + <code>delta</code>. When GSD's PLAN-0102 Task 1 completes, the system knows to increment the ePayment Frontend readiness by 0.20. The mapping is deterministic because FORGE generated both sides.</P>

    <H3>3. Graph Propagation</H3>
    <P>When a node crosses a readiness threshold, the system checks all nodes with <code>requires</code> edges. If a dependency was blocking, the system emits an unblocked event. If all dependencies of a Bubble node go green, it auto-promotes to Committed. Release probability recalculates in real-time.</P>

    <H2>No Local Agents</H2>
    <P>The reconciliation system runs in CI — where commits already flow. No daemon on developer laptops. No VS Code extension that needs to be running. The developer's workflow is unchanged: write code, push commits. The graph learns from the CI pipeline.</P>

    <Callout type="info" title="The Core Insight">Your Jira board can't do this because it doesn't have the data model to support it. A flat list of tickets has no notion of typed dependencies, multi-dimensional readiness, or propagation logic. The graph does.</Callout>
  </>);
}

function GitHubPage() {
  return (<>
    <H1>GitHub Action Integration</H1>
    <Badge color={COLORS.green}>Primary Reconciliation Surface</Badge>
    <P>The GitHub Action is the primary integration surface for closed-loop reconciliation. It runs in CI where commits already flow, requiring zero additional infrastructure.</P>

    <H2>How It Works</H2>
    <P>Triggered on push to main, sprint, or feature branches. Three steps:</P>
    <P><strong>1. Parse</strong> — Extract completion signals from commit messages using pattern matching. GSD: <code>feat(PLAN-0102)</code>. BMAD: <code>[STORY-002]</code>. Spec Kit: <code>[TASK-S7-01]</code>.</P>
    <P><strong>2. Lookup</strong> — Map parsed signals to graph nodes via <code>.forge/manifest.json</code> in the repository.</P>
    <P><strong>3. Reconcile</strong> — POST to FORGE API with <code>node_id</code>, <code>dimension</code>, <code>delta</code>, and <code>evidence</code> (commit SHA, diff summary).</P>

    <H2>Commit Pattern Matching</H2>
    <P>The action uses a fallback chain for signal detection:</P>
    <Table headers={["Priority", "Method", "Example"]}
      rows={[
        ["Primary", "Plan ID in commit message", "feat(PLAN-0102): CreditCard state machine"],
        ["Fallback", "File-path matching via manifest", "Files in src/components/CreditCard* map to PLAN-0102"],
        ["Manual", "Flagged for human triage", "Unreconciled signals appear in triage dashboard"],
      ]} />

    <H2>PR Impact Comments</H2>
    <P>The action posts a comment on every PR showing graph impact: "This PR moves ePayment Frontend 50% → 70% and unblocks Loan Origination." Code reviewers see release-level consequences alongside the code diff.</P>
  </>);
}

function VSCodePage() {
  return (<>
    <H1>VS Code Extension</H1>
    <Badge color={COLORS.blue}>Developer Visibility Surface</Badge>
    <P>Read-only by design. The extension subscribes to the FORGE API via WebSocket and displays server state — it doesn't compute anything locally.</P>

    <H2>Three Sidebar Panels</H2>
    <H3>Readiness Panel</H3>
    <P>Live readiness for the node associated with your current file or branch. Shows deltas from your current PR — "your changes move Frontend from 50% to 70%."</P>
    <H3>Spec Panel</H3>
    <P>Shovel-ready spec sections relevant to the file you're editing. If you're working on <code>CreditCardPayment.tsx</code>, the panel shows the component spec, state machine definition, validation rules, and associated DTOs. No context-switching to the browser.</P>
    <H3>Dependencies Panel</H3>
    <P>What's blocked by your node, and what you depend on. Notifications when upstream nodes go green — "Auth Service just hit 100% Backend readiness, your integration dependency is resolved."</P>

    <Callout type="tip" title="Zero Local State">The extension is a pure display surface. No local state to corrupt, no sync conflicts, no background processes. Works identically whether you're using Claude Code, Cursor, Copilot, or vim.</Callout>
  </>);
}

function ManifestPage() {
  return (<>
    <H1>Manifest Schema</H1>
    <P>The <code>.forge/manifest.json</code> file is version-controlled alongside your code. It maps every exported plan and task back to a specific graph node and readiness dimension. Because FORGE generates both sides of the mapping, the traceability is deterministic.</P>

    <H2>Structure</H2>
    <P>The manifest contains three top-level sections:</P>
    <H3>Node Mappings</H3>
    <P>Maps each node ID to its metadata: label, current readiness state, release assignment, and sprint assignment. This is the authoritative list of what the graph contains at export time.</P>
    <H3>Plan Mappings</H3>
    <P>Maps each plan ID to its tasks. Each task specifies the target node, readiness dimension, delta value, and commit pattern for recognition. Example: Plan PLAN-0102, Task 1 maps to node <code>epayment</code>, dimension <code>Frontend</code>, delta <code>0.20</code>, pattern <code>src/components/CreditCard*</code>.</P>
    <H3>Propagation Rules</H3>
    <P>Configurable threshold-based rules for automatic graph updates. Example: when <code>epayment</code> overall readiness ≥ 0.5, resolve the blocking edge to <code>loan-origination</code>. When <code>epayment</code> ≥ 0.8, promote <code>loan-origination</code> from Bubble to Committed.</P>

    <Callout type="warning" title="Version Control">The manifest must be committed to the repository alongside the code. This ensures it can never drift from the codebase. The GitHub Action reads it from the repo at runtime — no external configuration needed.</Callout>
  </>);
}

function ComparisonPage() {
  return (<>
    <H1>Agile vs FORGE</H1>
    <P>A direct comparison across every dimension of delivery management.</P>
    <Table headers={["Dimension", "Agile (Jira, Linear, etc.)", "FORGE"]}
      rows={[
        ["Work model", "Flat backlog or rigid hierarchy", "Directed acyclic graph with typed edges"],
        ["Readiness", "Single status field (To Do / In Progress / Done)", "Six-dimension state (Req, Design, FE, BE, Integration, Test)"],
        ["Sprint entry", "Human judgment in grooming meetings", "Systemic: all dimensions must be green"],
        ["Estimation", "Story points (negotiated, subjective)", "Readiness state (measured, objective)"],
        ["Overhead", "Hidden in velocity; blamed as variance", "First-class budget (explicit prod/overhead split)"],
        ["Release planning", "Guess from ticket counts", "Probabilistic: Committed / Bubble / Deferred with computed confidence"],
        ["Dependencies", "Implicit or manually tracked", "Native graph: query, traverse, propagate"],
        ["Executive view", "Status reports reconstructed from tickets", "Real-time probability dashboard from readiness states"],
        ["AI tool integration", "None", "Bidirectional: specs export to tools, completions flow back"],
        ["Spec quality", "Acceptance criteria (often vague)", "Six-section structured spec with completeness enforcement"],
        ["Blocking visibility", "Someone mentions it in standup", "Graph traversal: 'show me everything blocked by X'"],
        ["Mid-sprint discovery", "Common; absorbed as sprint failure", "Structurally prevented: incomplete specs can't enter sprint"],
      ]} />
  </>);
}

function GlossaryPage() {
  return (<>
    <H1>Glossary</H1>
    <Table headers={["Term", "Definition"]}
      rows={[
        ["Node", "A unit of work in the FORGE graph — feature, service, screen, integration, test suite, device, or custom type"],
        ["Edge", "A typed relationship between nodes: blocks, requires, feeds-into, tested-by, deployed-with, contains"],
        ["Readiness", "Multi-dimensional state (0-100%) across six dimensions measuring execution preparedness"],
        ["Shovel-Ready", "A node whose specification is complete across all six sections with zero open questions"],
        ["Bubble", "Scope that is targeted for a release but at risk of slipping based on readiness state"],
        ["Committed", "Scope that will ship — all dependencies identified and readiness tracking is green or progressing"],
        ["Deferred", "Scope explicitly excluded from a release — named and visible, not forgotten"],
        ["Propagation", "Automatic graph updates when a node crosses a readiness threshold, affecting downstream nodes"],
        ["Manifest", ".forge/manifest.json — version-controlled mapping of plans/tasks to graph nodes/dimensions"],
        ["Reconciliation", "The process of mapping code completion signals back to graph readiness updates"],
        ["Execution Window", "A time-boxed sprint that pulls from the ready queue with explicit capacity budgets"],
        ["Specification Gap", "The distance between what an Agile tool contains and what an AI-powered dev tool needs"],
        ["Context Rot", "Degradation of AI tool accuracy as context windows fill with irrelevant information"],
        ["Overhead Budget", "Explicit allocation for bugs, coordination, environment work — not hidden in velocity"],
      ]} />
  </>);
}

function RoadmapPage() {
  return (<>
    <H1>Roadmap</H1>
    <H2>Phase 1: Foundation (Months 1-6)</H2>
    <P>Graph Canvas with zoomable infinite canvas. Multi-dimensional readiness panels. Typed edges. Sprint execution engine with ready-queue pull. Release probability view with Committed / Bubble / Deferred. Shovel-ready specification cards with six-section structure. AI readiness monitoring (inconsistency detection, risk prediction).</P>

    <H2>Phase 2: AI Integration (Months 6-12)</H2>
    <P>Spec export system with five targets (GSD, BMAD, Spec Kit, Claude Code, Generic). Closed-loop reconciliation via GitHub Action. Manifest generation and traceability mapping. Readiness propagation engine. PR impact comments. VS Code extension (read-only sidebar).</P>

    <H2>Phase 3: Intelligence (Months 12-18)</H2>
    <P>Historical throughput modeling per team and node type. Sprint spillover prediction. Auto-reconciliation with file-path fallback. Unreconciled signal triage dashboard. Spec templates marketplace.</P>

    <H2>Phase 4: Platform (Months 18-24)</H2>
    <P>Multi-org, multi-project graph with cross-project dependencies. RBAC, SSO, audit logging. Public API and graph query language. Embedded views for third-party tools. Custom node types and readiness dimensions.</P>
  </>);
}

// ─── MAIN APP ───
const PAGES = {
  welcome: WelcomePage, why: WhyPage, graph: GraphPage, readiness: ReadinessPage,
  shovel: ShovelPage, sprints: SprintsPage, probability: ProbabilityPage,
  aitools: AIToolsPage, export: ExportPage, closedloop: ClosedLoopPage,
  github: GitHubPage, vscode: VSCodePage, manifest: ManifestPage,
  comparison: ComparisonPage, glossary: GlossaryPage, roadmap: RoadmapPage,
};

export default function ForgeMethodDocs() {
  const [activePage, setActivePage] = useState("welcome");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const PageComponent = PAGES[activePage] || WelcomePage;

  useEffect(() => { window.scrollTo?.(0, 0); }, [activePage]);

  return (
    <div style={{ display: "flex", height: "100vh", background: COLORS.bg, fontFamily: "'Calibri', -apple-system, sans-serif", color: COLORS.text, overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Georgia&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 260 : 0, flexShrink: 0, background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`, overflowY: "auto", overflowX: "hidden", transition: "width 0.2s", display: "flex", flexDirection: "column" }}>
        {/* Logo */}
        <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0 }}>F</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, lineHeight: 1 }}>FORGE Method</div>
            <div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>Documentation</div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ padding: "8px 0", flex: 1 }}>
          {NAV.map((item, i) => {
            if (item.type === "section") {
              return <div key={i} style={{ padding: "16px 16px 4px", fontSize: 10, fontWeight: 700, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.1em" }}>{item.label}</div>;
            }
            const isActive = activePage === item.id;
            return (
              <button key={item.id} onClick={() => setActivePage(item.id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", border: "none", cursor: "pointer", textAlign: "left", fontSize: 13,
                background: isActive ? COLORS.accentDim : "transparent",
                color: isActive ? COLORS.accent : COLORS.textMuted,
                fontWeight: isActive ? 600 : 400, transition: "all 0.1s",
                borderRight: isActive ? `2px solid ${COLORS.accent}` : "2px solid transparent",
              }}>
                <span style={{ fontSize: 11, opacity: 0.7, width: 16, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${COLORS.border}`, fontSize: 10, color: COLORS.textDim }}>
          Free & open methodology.
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ height: 44, display: "flex", alignItems: "center", padding: "0 20px", borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0, gap: 12 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "4px 8px", color: COLORS.textMuted, cursor: "pointer", fontSize: 12 }}>
            {sidebarOpen ? "◁" : "▷"}
          </button>
          <span style={{ fontSize: 12, color: COLORS.textDim }}>
            {NAV.find(n => n.id === activePage)?.label || "FORGE Method"}
          </span>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px 80px", maxWidth: 780 }}>
          <PageComponent />
        </div>
      </div>
    </div>
  );
}
