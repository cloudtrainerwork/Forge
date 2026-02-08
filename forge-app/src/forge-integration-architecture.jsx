import { useState, useEffect, useRef, useMemo } from "react";

// ─── FORGE Integration Architecture ───
// GitHub Action + VS Code Extension + Webhook API
// No local agents. The CI pipeline IS the agent.

const C = {
  bg: "#0b0c10", surface: "#13141c", hover: "#1a1c28",
  border: "#1e2038", borderLit: "#2d3058", text: "#e0e2f0", muted: "#636888",
  dim: "#363a58", accent: "#f97316", accentDim: "#f9731618",
  green: "#34d399", greenDim: "#34d39918", yellow: "#fbbf24", yellowDim: "#fbbf2418",
  red: "#f87171", redDim: "#f8717118", blue: "#60a5fa", blueDim: "#60a5fa18",
  purple: "#a78bfa", purpleDim: "#a78bfa18", cyan: "#22d3ee", cyanDim: "#22d3ee18",
  github: "#c9d1d9", githubBg: "#0d1117", vscode: "#007acc", vscodeBg: "#1e1e1e",
};

// ─── Architecture Sections ───
const SECTIONS = [
  { id: "overview", label: "System Flow", icon: "◇" },
  { id: "github-action", label: "GitHub Action", icon: "⬡" },
  { id: "vscode", label: "VS Code Extension", icon: "◻" },
  { id: "manifest", label: "Manifest Schema", icon: "◆" },
  { id: "webhooks", label: "Webhook API", icon: "⬢" },
];

// ─── Animated Flow Diagram ───
function SystemFlowDiagram() {
  const [activeStep, setActiveStep] = useState(0);
  const [autoCycle, setAutoCycle] = useState(true);

  useEffect(() => {
    if (!autoCycle) return;
    const timer = setInterval(() => setActiveStep(s => (s + 1) % 7), 2400);
    return () => clearInterval(timer);
  }, [autoCycle]);

  const steps = [
    { id: 0, label: "Developer pushes code", area: "dev", detail: "GSD/BMAD/SpecKit produces atomic git commit with structured message", color: C.muted },
    { id: 1, label: "GitHub Action triggers", area: "gh", detail: "on: push — action parses commit message structure", color: C.github },
    { id: 2, label: "Parse completion signal", area: "gh", detail: "Extract plan_id, task_id, status from commit metadata", color: C.yellow },
    { id: 3, label: "Lookup traceability mapping", area: "gh", detail: "Read .forge/manifest.json → find node_id + dimension", color: C.accent },
    { id: 4, label: "POST to FORGE API", area: "api", detail: "POST /api/reconcile with {node_id, dimension, delta, evidence}", color: C.blue },
    { id: 5, label: "Graph update + propagation", area: "forge", detail: "Update readiness, run propagation rules, emit events", color: C.green },
    { id: 6, label: "VS Code extension refreshes", area: "vscode", detail: "WebSocket push → sidebar updates readiness, spec context", color: C.vscode },
  ];

  const areas = [
    { id: "dev", label: "Developer", x: 40, color: C.muted, icon: "👤" },
    { id: "gh", label: "GitHub Actions", x: 220, color: C.github, icon: "⬡" },
    { id: "api", label: "FORGE API", x: 440, color: C.blue, icon: "◆" },
    { id: "forge", label: "Graph Engine", x: 600, color: C.green, icon: "◇" },
    { id: "vscode", label: "VS Code Ext", x: 780, color: C.vscode, icon: "◻" },
  ];

  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
        Click any step to pause auto-cycling and inspect details.
      </div>

      {/* Flow lanes */}
      <div style={{ position: "relative", height: 100, marginBottom: 24, background: `${C.surface}80`, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {areas.map(area => {
          const isActive = steps[activeStep]?.area === area.id;
          const w = 160;
          return (
            <div key={area.id} style={{
              position: "absolute", left: area.x, top: 12, width: w, textAlign: "center",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, margin: "0 auto 6px",
                background: isActive ? `${area.color}20` : C.bg,
                border: `2px solid ${isActive ? area.color : C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                transition: "all 0.4s ease",
                boxShadow: isActive ? `0 0 20px ${area.color}30` : "none",
              }}>{area.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: isActive ? area.color : C.muted, transition: "color 0.3s", letterSpacing: "0.04em" }}>{area.label}</div>
            </div>
          );
        })}
        {/* Connection lines */}
        <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {[
            { x1: 115, x2: 275 }, { x1: 375, x2: 495 },
            { x1: 575, x2: 655 }, { x1: 735, x2: 835 },
          ].map((line, i) => {
            const stepIdx = [0, 3, 4, 5][i];
            const isActive = activeStep >= stepIdx && activeStep <= stepIdx + 1;
            return <line key={i} x1={line.x1} y1={36} x2={line.x2} y2={36} stroke={isActive ? C.green : C.dim} strokeWidth={isActive ? 2 : 1} strokeDasharray={isActive ? "none" : "4,4"} opacity={isActive ? 0.8 : 0.3} style={{ transition: "all 0.4s" }} />;
          })}
        </svg>
      </div>

      {/* Step timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {steps.map((step, i) => {
          const isActive = activeStep === i;
          const isPast = activeStep > i;
          return (
            <div key={i} onClick={() => { setActiveStep(i); setAutoCycle(false); }}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12, padding: "8px 12px", borderRadius: 8,
                background: isActive ? `${step.color}08` : "transparent",
                border: `1px solid ${isActive ? `${step.color}30` : "transparent"}`,
                cursor: "pointer", transition: "all 0.2s",
              }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isActive ? `${step.color}20` : isPast ? C.greenDim : C.bg,
                border: `2px solid ${isActive ? step.color : isPast ? C.green : C.border}`,
                fontSize: 10, fontWeight: 700, color: isActive ? step.color : isPast ? C.green : C.dim,
                transition: "all 0.3s",
              }}>
                {isPast ? "✓" : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? C.text : C.muted, transition: "color 0.2s" }}>{step.label}</div>
                <div style={{ fontSize: 10, color: isActive ? step.color : C.dim, marginTop: 2, lineHeight: 1.4, transition: "color 0.3s" }}>{step.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
      {!autoCycle && (
        <button onClick={() => setAutoCycle(true)} style={{ marginTop: 10, padding: "4px 12px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, fontSize: 10, cursor: "pointer" }}>
          ▶ Resume auto-cycle
        </button>
      )}
    </div>
  );
}

// ─── Code Block ───
function Code({ title, lang, children }) {
  return (
    <div style={{ background: "#090a0e", border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 14, overflow: "hidden" }}>
      {title && (
        <div style={{ padding: "6px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</span>
          {lang && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: C.blueDim, color: C.blue, fontWeight: 600 }}>{lang}</span>}
        </div>
      )}
      <pre style={{ margin: 0, padding: 16, fontSize: 11.5, color: C.text, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: 1.65, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{children}</pre>
    </div>
  );
}

// ─── Callout ───
function Callout({ color, icon, title, children }) {
  return (
    <div style={{ background: `${color}06`, border: `1px solid ${color}25`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</span>
      </div>
      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

// ─── Section: GitHub Action ───
function GitHubActionSection() {
  return (
    <div>
      <Callout color={C.github} icon="⬡" title="Why GitHub Actions">
        The reconciliation agent doesn't live on anyone's machine. It runs in CI — where every commit already flows.
        GSD, BMAD, and Spec Kit all produce git commits as their primary completion artifact.
        A GitHub Action triggered on push is zero-install, zero-config for developers.
      </Callout>

      <Code title=".github/workflows/forge-reconcile.yml" lang="yaml">{`name: FORGE Reconciliation
on:
  push:
    branches: [main, 'sprint/**', 'feature/**']

jobs:
  reconcile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2  # need parent commit for diff

      - name: Parse completion signals
        id: parse
        uses: forge-platform/action-parse@v1
        with:
          # Parses structured commit messages from GSD/BMAD/SpecKit
          # GSD:    feat(PLAN-0102): CreditCardPaymentControl state machine
          # BMAD:   [STORY-002] CC payment MVP flow complete
          # SpecKit: [TASK-S7-01] screen 7 application sections
          manifest_path: .forge/manifest.json
          commit_range: \${{ github.event.before }}..\${{ github.sha }}

      - name: Reconcile with FORGE graph
        if: steps.parse.outputs.signals != '[]'
        uses: forge-platform/action-reconcile@v1
        with:
          forge_api_url: \${{ secrets.FORGE_API_URL }}
          forge_api_key: \${{ secrets.FORGE_API_KEY }}
          signals: \${{ steps.parse.outputs.signals }}
          # Includes: node_id, dimension, delta, evidence (files changed)
          # Also triggers propagation rules server-side

      - name: Post summary to PR
        if: github.event_name == 'pull_request'
        uses: forge-platform/action-summary@v1
        with:
          forge_api_url: \${{ secrets.FORGE_API_URL }}
          forge_api_key: \${{ secrets.FORGE_API_KEY }}
          # Adds a comment showing readiness delta for this PR`}</Code>

      <Code title="Example: What the parse step extracts from a GSD commit" lang="json">{`{
  "signals": [
    {
      "source": "gsd",
      "plan_id": "PLAN-0102",
      "task_id": 1,
      "commit_sha": "abc123f",
      "commit_message": "feat(0102): CreditCardPaymentControl state machine",
      "files_changed": [
        "src/components/CreditCardPayment.tsx",
        "src/state/paymentState.ts"
      ],
      // Resolved from .forge/manifest.json:
      "node_id": "e-payment",
      "dimension": "Frontend",
      "delta": 0.20,
      "verification": {
        "status": "passed",
        "tests_run": 12,
        "tests_passed": 12
      }
    }
  ]
}`}</Code>

      <Callout color={C.yellow} icon="⚡" title="PR Summary Comment">
        When a PR is opened, the action adds a comment showing the readiness impact:
        "This PR moves ePayment Frontend from 50% → 70% and unblocks Loan Origination's integration dependency."
        Reviewers see the graph impact before they merge.
      </Callout>
    </div>
  );
}

// ─── Section: VS Code Extension ───
function VSCodeSection() {
  const [activePanel, setActivePanel] = useState("readiness");

  return (
    <div>
      <Callout color={C.vscode} icon="◻" title="VS Code Extension: Visibility, Not Computation">
        Like Azurite emulates Azure storage in your editor, the FORGE extension brings graph context into your coding environment.
        It doesn't run agents or compute readiness — it reads from the FORGE API and surfaces what matters while you code.
      </Callout>

      {/* VS Code mockup */}
      <div style={{ background: C.vscodeBg, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
        {/* Title bar */}
        <div style={{ height: 30, background: "#323233", display: "flex", alignItems: "center", padding: "0 12px", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
          </div>
          <span style={{ fontSize: 11, color: "#999", fontFamily: "system-ui" }}>CreditCardPayment.tsx — ePayment — VS Code</span>
        </div>

        <div style={{ display: "flex", height: 400 }}>
          {/* Activity bar */}
          <div style={{ width: 48, background: "#333", display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0", gap: 4 }}>
            {["📁", "🔍", "⎇", "🐛"].map((icon, i) => (
              <div key={i} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, opacity: 0.5 }}>{icon}</div>
            ))}
            <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, borderLeft: `2px solid ${C.vscode}`, color: C.vscode }}>◆</div>
          </div>

          {/* FORGE Sidebar */}
          <div style={{ width: 260, background: "#252526", borderRight: `1px solid #333`, overflowY: "auto" }}>
            <div style={{ padding: "8px 12px", borderBottom: `1px solid #333` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.vscode, textTransform: "uppercase", letterSpacing: "0.08em" }}>FORGE</div>
            </div>

            {/* Panel tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid #333` }}>
              {[["readiness", "Readiness"], ["spec", "Spec"], ["deps", "Dependencies"]].map(([key, label]) => (
                <button key={key} onClick={() => setActivePanel(key)} style={{
                  flex: 1, padding: "6px 0", border: "none", cursor: "pointer",
                  background: activePanel === key ? "#1e1e1e" : "transparent",
                  color: activePanel === key ? C.text : "#888", fontSize: 10, fontWeight: 600,
                  borderBottom: activePanel === key ? `2px solid ${C.vscode}` : "2px solid transparent",
                }}>
                  {label}
                </button>
              ))}
            </div>

            {activePanel === "readiness" && (
              <div style={{ padding: 12 }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>ePayment</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: C.green, fontFamily: "monospace" }}>78%</span>
                  </div>
                  <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: C.greenDim, color: C.green, fontWeight: 600 }}>COMMITTED</span>
                  <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: C.blueDim, color: C.blue, fontWeight: 600, marginLeft: 4 }}>Sprint 7</span>
                </div>
                {[["Frontend", 0.85, "+15% this PR"], ["Backend", 0.9, ""], ["Integration", 0.6, ""], ["Test", 0.8, "+25% today"], ["Environment", 0.75, ""]].map(([dim, val, note]) => (
                  <div key={dim} style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, color: "#aaa" }}>{dim}</span>
                      <span style={{ fontSize: 10, color: val >= 0.8 ? C.green : val >= 0.5 ? C.yellow : C.red, fontFamily: "monospace", fontWeight: 600 }}>{Math.round(val * 100)}%{note && <span style={{ color: C.green, fontSize: 9, marginLeft: 4 }}>{note}</span>}</span>
                    </div>
                    <div style={{ height: 3, background: "#333", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${val * 100}%`, background: val >= 0.8 ? C.green : val >= 0.5 ? C.yellow : C.red, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activePanel === "spec" && (
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 10, color: C.vscode, fontWeight: 700, marginBottom: 8 }}>SHOVEL-READY SPEC</div>
                {[
                  { dim: "CC Validation Rules", items: ["Number: 15-16 digits", "Expiry: current +10 years", "Name: alpha, max 35", "ZIP: 5-9 digits"] },
                  { dim: "State Machine", items: ["EntryFields", "Verification", "Confirmation", "Cancelation", "Errors"] },
                ].map((group, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: "#ccc", fontWeight: 600, marginBottom: 4 }}>{group.dim}</div>
                    {group.items.map((item, j) => (
                      <div key={j} style={{ fontSize: 10, color: "#999", padding: "2px 0", fontFamily: "monospace" }}>  {item}</div>
                    ))}
                  </div>
                ))}
                <div style={{ marginTop: 8, padding: 6, background: "#332200", borderRadius: 4, border: `1px solid #664400` }}>
                  <div style={{ fontSize: 9, color: C.yellow, fontWeight: 700 }}>⚠ OPEN QUESTION</div>
                  <div style={{ fontSize: 10, color: "#ccc" }}>Where does address standardization occur?</div>
                </div>
              </div>
            )}

            {activePanel === "deps" && (
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 10, color: C.vscode, fontWeight: 700, marginBottom: 8 }}>BLOCKED BY THIS NODE</div>
                {[["Loan Origination", "requires", 52], ["Cash Advance", "requires", 49]].map(([name, type, readiness], i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: `1px solid #333` }}>
                    <span style={{ fontSize: 10, color: C.red }}>⬡</span>
                    <span style={{ fontSize: 10, color: "#ccc", flex: 1 }}>{name}</span>
                    <span style={{ fontSize: 9, fontFamily: "monospace", color: readiness >= 50 ? C.yellow : C.red }}>{readiness}%</span>
                  </div>
                ))}
                <div style={{ fontSize: 10, color: C.vscode, fontWeight: 700, marginTop: 12, marginBottom: 8 }}>DEPENDS ON</div>
                <div style={{ fontSize: 10, color: "#999" }}>None (leaf node)</div>
              </div>
            )}
          </div>

          {/* Editor area */}
          <div style={{ flex: 1, background: "#1e1e1e", padding: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.7 }}>
            <div style={{ color: "#608b4e" }}>{"// CreditCardPaymentControl.tsx"}</div>
            <div style={{ color: "#608b4e" }}>{"// FORGE: e-payment > Frontend > PLAN-0102"}</div>
            <div style={{ height: 8 }} />
            <div><span style={{ color: "#569cd6" }}>export</span> <span style={{ color: "#569cd6" }}>function</span> <span style={{ color: "#dcdcaa" }}>CreditCardPaymentControl</span><span style={{ color: "#ccc" }}>()</span> <span style={{ color: "#ccc" }}>{"{"}</span></div>
            <div><span style={{ color: "#ccc" }}>  </span><span style={{ color: "#569cd6" }}>const</span> <span style={{ color: "#9cdcfe" }}>[state, dispatch]</span> <span style={{ color: "#ccc" }}>=</span> <span style={{ color: "#dcdcaa" }}>usePaymentState</span><span style={{ color: "#ccc" }}>();</span></div>
            <div style={{ height: 8 }} />
            <div style={{ color: "#608b4e" }}>  {"// Spec: 5 states — Entry → Verify → Confirm"}</div>
            <div style={{ color: "#608b4e" }}>  {"//                        → Cancel"}</div>
            <div style={{ color: "#608b4e" }}>  {"//                        → Errors"}</div>
            <div style={{ height: 8 }} />
            <div><span style={{ color: "#ccc" }}>  </span><span style={{ color: "#c586c0" }}>if</span> <span style={{ color: "#ccc" }}>(state ===</span> <span style={{ color: "#ce9178" }}>'EntryFields'</span><span style={{ color: "#ccc" }}>)</span> <span style={{ color: "#ccc" }}>{"{"}</span></div>
            <div><span style={{ color: "#ccc" }}>    </span><span style={{ color: "#c586c0" }}>return</span> <span style={{ color: "#ccc" }}>&lt;</span><span style={{ color: "#4ec9b0" }}>CreditCardForm</span></div>
            <div style={{ color: "#608b4e" }}>      {"// Spec: CC number 15-16 digits"}</div>
            <div style={{ color: "#608b4e" }}>      {"// Spec: Expiry current year + 10"}</div>
            <div style={{ color: "#608b4e" }}>      {"// Spec: Names alpha max 35"}</div>
            <div><span style={{ color: "#ccc" }}>      </span><span style={{ color: "#9cdcfe" }}>onSubmit</span><span style={{ color: "#ccc" }}>={"{"}</span><span style={{ color: "#dcdcaa" }}>handleEntryComplete</span><span style={{ color: "#ccc" }}>{"}"}</span></div>
            <div><span style={{ color: "#ccc" }}>    /&gt;;</span></div>
            <div><span style={{ color: "#ccc" }}>  {"}"}</span></div>
          </div>
        </div>
      </div>

      <Callout color={C.purple} icon="📌" title="Extension Features">
        <strong>Readiness panel:</strong> Live readiness for the node you're working on. Shows deltas from your current branch/PR.
        <br /><strong>Spec panel:</strong> The shovel-ready spec sections relevant to your current file — validation rules, DTOs, state machines. No context-switching to a browser.
        <br /><strong>Dependency panel:</strong> What's blocked by your node, and what you depend on. If an upstream node goes green, you get a notification.
        <br /><strong>Status bar:</strong> Shows current node + overall readiness in the VS Code status bar, like GitLens shows branch info.
      </Callout>

      <Code title="Extension activation — package.json (relevant excerpt)" lang="json">{`{
  "contributes": {
    "viewsContainers": {
      "activitybar": [{
        "id": "forge",
        "title": "FORGE",
        "icon": "resources/forge-icon.svg"
      }]
    },
    "views": {
      "forge": [
        { "id": "forge.readiness", "name": "Readiness" },
        { "id": "forge.spec", "name": "Shovel-Ready Spec" },
        { "id": "forge.deps", "name": "Dependencies" }
      ]
    },
    "configuration": {
      "properties": {
        "forge.apiUrl": { "type": "string", "default": "https://api.forgeplatform.io" },
        "forge.projectId": { "type": "string", "description": "FORGE project ID" }
      }
    }
  }
}`}</Code>
    </div>
  );
}

// ─── Section: Manifest Schema ───
function ManifestSection() {
  return (
    <div>
      <Callout color={C.accent} icon="◆" title="The Manifest Is The Traceability Contract">
        When FORGE exports plans to GSD/BMAD/SpecKit, it also generates a <code style={{ fontFamily: "monospace", background: C.accentDim, padding: "1px 4px", borderRadius: 3 }}>.forge/manifest.json</code> that maps every generated plan/task back to the graph node and readiness dimension it affects.
        This is what the GitHub Action reads to know "commit <code>feat(0102)</code> means ePayment Frontend +20%."
        The manifest is version-controlled alongside the code.
      </Callout>

      <Code title=".forge/manifest.json" lang="json">{`{
  "forge_version": "1.0",
  "project_id": "prj_abc123",
  "exported_at": "2026-02-05T14:30:00Z",
  "export_target": "gsd",

  "node_mappings": {
    "e-payment": {
      "node_id": "e-payment",
      "label": "ePayment - Online Payment Processing",
      "spec_version": "3.0",
      "release": "1.1",
      "sprint": "Sprint 7"
    }
  },

  "plan_mappings": [
    {
      "plan_id": "PLAN-0101",
      "wave": 1,
      "node_id": "e-payment",
      "tasks": [
        {
          "task_id": 1,
          "dimension": "Backend",
          "delta": 0.20,
          "description": "IBillingRepository interface + DTOs",
          "commit_pattern": "feat(0101)*IBillingRepository*",
          "verification": {
            "type": "test_pass",
            "pattern": "tests/data/billing*.test.*"
          }
        },
        {
          "task_id": 2,
          "dimension": "Frontend",
          "delta": 0.15,
          "description": "BillingAmountDueControl (MV pattern)",
          "commit_pattern": "feat(0101)*BillingAmountDue*"
        },
        {
          "task_id": 3,
          "dimension": "Integration",
          "delta": 0.20,
          "description": "ESB billing retrieval",
          "commit_pattern": "feat(0101)*ESB*billing*"
        }
      ]
    },
    {
      "plan_id": "PLAN-0102",
      "wave": 1,
      "node_id": "e-payment",
      "tasks": [
        {
          "task_id": 1,
          "dimension": "Frontend",
          "delta": 0.20,
          "description": "CreditCardPaymentControl state machine",
          "commit_pattern": "feat(0102)*CreditCard*"
        },
        {
          "task_id": 2,
          "dimension": "Test",
          "delta": 0.25,
          "description": "CC field validation (8 rules)",
          "commit_pattern": "test(0102)*validation*"
        },
        {
          "task_id": 3,
          "dimension": "Frontend",
          "delta": 0.10,
          "description": "CC review page with masked display",
          "commit_pattern": "feat(0102)*review*"
        }
      ]
    }
  ],

  "propagation_rules": [
    {
      "trigger": { "node_id": "e-payment", "condition": "overall >= 0.5" },
      "effect": { "unblocks": ["loan-orig", "cash-advance"] }
    },
    {
      "trigger": { "node_id": "e-payment", "condition": "overall >= 0.8" },
      "effect": { "promotes": "loan-orig", "from": "BUBBLE", "to": "COMMITTED" }
    }
  ]
}`}</Code>

      <Callout color={C.green} icon="🔗" title="Commit Pattern Matching">
        The <code style={{ fontFamily: "monospace", background: C.greenDim, padding: "1px 4px", borderRadius: 3 }}>commit_pattern</code> field uses glob matching against commit messages. GSD already produces structured commit messages with plan IDs (<code>feat(PLAN-0102): ...</code>), so the patterns are naturally precise. For BMAD stories, the pattern matches <code>[STORY-002]</code>. The action falls back to file-path matching if the commit message doesn't match — if files in <code>src/components/CreditCard*</code> changed, it maps to the right task.
      </Callout>
    </div>
  );
}

// ─── Section: Webhook API ───
function WebhookSection() {
  return (
    <div>
      <Callout color={C.blue} icon="⬢" title="The API Is The Integration Point">
        GitHub Actions POST here. The VS Code extension subscribes here. GitLab CI, Bitbucket Pipelines, Jenkins — anything that can make an HTTP request can reconcile.
      </Callout>

      <Code title="POST /api/v1/reconcile" lang="http">{`POST /api/v1/reconcile HTTP/1.1
Host: api.forgeplatform.io
Authorization: Bearer forge_key_xxxxx
Content-Type: application/json

{
  "project_id": "prj_abc123",
  "signals": [
    {
      "node_id": "e-payment",
      "dimension": "Frontend",
      "delta": 0.20,
      "source": "gsd",
      "plan_id": "PLAN-0102",
      "task_id": 1,
      "commit_sha": "abc123f",
      "evidence": {
        "files_changed": ["src/components/CreditCardPayment.tsx"],
        "tests_passed": 12,
        "tests_failed": 0
      }
    }
  ]
}`}</Code>

      <Code title="Response: 200 OK" lang="json">{`{
  "reconciled": [
    {
      "node_id": "e-payment",
      "dimension": "Frontend",
      "previous": 0.50,
      "current": 0.70,
      "overall_previous": 0.53,
      "overall_current": 0.57
    }
  ],
  "propagations": [
    {
      "type": "unblocked",
      "node_id": "loan-orig",
      "message": "Loan Origination unblocked by ePayment reaching 57%"
    }
  ],
  "release_impact": {
    "1.1": { "previous_probability": 42, "current_probability": 48 }
  }
}`}</Code>

      <Code title="WebSocket: Real-time updates for VS Code / dashboards" lang="text">{`ws://api.forgeplatform.io/ws/v1/projects/prj_abc123

# Client subscribes to node events:
→  { "subscribe": ["e-payment", "loan-orig", "e-sig"] }

# Server pushes on any readiness change:
←  {
     "event": "readiness_update",
     "node_id": "e-payment",
     "dimension": "Frontend",
     "previous": 0.50,
     "current": 0.70,
     "timestamp": "2026-02-05T14:32:15Z"
   }

←  {
     "event": "propagation",
     "type": "unblocked",
     "node_id": "loan-orig",
     "caused_by": "e-payment",
     "timestamp": "2026-02-05T14:32:15Z"
   }`}</Code>

      <Callout color={C.cyan} icon="🔌" title="Other CI Systems">
        <strong>GitLab CI:</strong> Same YAML structure, use <code>curl</code> to POST to the reconcile endpoint.
        <br /><strong>Bitbucket Pipelines:</strong> Pipe step with the FORGE CLI (<code>npx @forge/cli reconcile</code>).
        <br /><strong>Jenkins:</strong> Post-build step calling the REST API.
        <br /><strong>Local dev (optional):</strong> Git post-commit hook for instant feedback. Still hits the API, not a local agent.
      </Callout>
    </div>
  );
}

// ─── Main App ───
export default function ForgeIntegrationArch() {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div style={{ width: "100%", height: "100vh", background: C.bg, display: "flex", fontFamily: "'DM Sans', -apple-system, sans-serif", color: C.text, overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      <div style={{ width: 220, borderRight: `1px solid ${C.border}`, background: C.surface, flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: `linear-gradient(135deg, ${C.accent}, #fb923c)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>F</div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>FORGE</span>
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>Integration Architecture</div>
          <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>No local agents. CI is the agent.</div>
        </div>

        <div style={{ flex: 1 }}>
          {SECTIONS.map(s => {
            const active = s.id === activeSection;
            return (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "10px 16px", background: active ? C.hover : "transparent",
                  border: "none", borderLeft: `3px solid ${active ? C.accent : "transparent"}`,
                  cursor: "pointer", textAlign: "left",
                }}>
                <span style={{ fontSize: 12, color: active ? C.accent : C.dim }}>{s.icon}</span>
                <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? C.text : C.muted }}>{s.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ padding: 16, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 9, color: C.dim, lineHeight: 1.5 }}>
            Developer pushes → GitHub Action parses → FORGE API reconciles → Graph propagates → VS Code refreshes
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        {activeSection === "overview" && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Reconciliation Without Local Agents</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px", lineHeight: 1.6 }}>
              Three integration surfaces. Zero install burden on developers. The CI pipeline is the agent.
            </p>
            <SystemFlowDiagram />
          </div>
        )}
        {activeSection === "github-action" && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 6px" }}>GitHub Action</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px", lineHeight: 1.6 }}>
              Every commit is a completion signal. The action parses it, maps it to the graph, and reconciles.
            </p>
            <GitHubActionSection />
          </div>
        )}
        {activeSection === "vscode" && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 6px" }}>VS Code Extension</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px", lineHeight: 1.6 }}>
              Readiness, spec context, and dependency visibility — right in your editor.
            </p>
            <VSCodeSection />
          </div>
        )}
        {activeSection === "manifest" && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 6px" }}>Manifest Schema</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px", lineHeight: 1.6 }}>
              The .forge/manifest.json is the traceability contract between exported plans and the graph.
            </p>
            <ManifestSection />
          </div>
        )}
        {activeSection === "webhooks" && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 6px" }}>Webhook & API</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px", lineHeight: 1.6 }}>
              REST for reconciliation. WebSocket for live updates. Works with any CI system.
            </p>
            <WebhookSection />
          </div>
        )}
      </div>
    </div>
  );
}
