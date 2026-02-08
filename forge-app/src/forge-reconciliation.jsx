import { useState, useMemo, useRef, useCallback, useEffect } from "react";

// ─── FORGE + Reconciliation Agent ───
// Closed-loop: Spec → Export → Agent Executes → Completion Signal → Graph Update → Propagation

const C = {
  bg: "#08090d", surface: "#111219", hover: "#1c1e2d",
  border: "#1f2235", borderActive: "#3b4068", text: "#e4e6f2", textMuted: "#6d7196",
  textDim: "#3a3e5c", accent: "#f97316", accentDim: "#f9731620", green: "#22c55e",
  greenDim: "#22c55e20", yellow: "#eab308", yellowDim: "#eab30820", red: "#ef4444",
  redDim: "#ef444420", blue: "#3b82f6", blueDim: "#3b82f620", purple: "#a855f7",
  purpleDim: "#a855f720", cyan: "#06b6d4", cyanDim: "#06b6d420",
};

const DIMS = ["Frontend", "Backend", "Integration", "Test", "Environment"];
const CONF = {
  COMMITTED: { label: "Committed", color: C.green, bg: C.greenDim },
  BUBBLE: { label: "Bubble", color: C.yellow, bg: C.yellowDim },
  DEFERRED: { label: "Deferred", color: C.textMuted, bg: "#1e2040" },
};
const NTYPES = {
  FEATURE: { label: "Feature", color: C.accent, icon: "◆" },
  SERVICE: { label: "Service", color: C.blue, icon: "⬡" },
  SCREEN: { label: "Screen", color: C.purple, icon: "◻" },
  INTEGRATION: { label: "Integration", color: C.cyan, icon: "⬢" },
  DEVICE: { label: "Device", color: C.yellow, icon: "◈" },
};

const avg = (r) => Object.values(r).reduce((a, b) => a + b, 0) / Object.values(r).length;
const rColor = (v) => v >= 0.8 ? C.green : v >= 0.5 ? C.yellow : v >= 0.2 ? C.accent : C.red;
const ts = () => new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

function Badge({ children, color, bg }) {
  return <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color, background: bg, border: `1px solid ${color}20`, whiteSpace: "nowrap" }}>{children}</span>;
}

// ─── Core Data: Nodes with mutable readiness ───
const INITIAL_NODES = [
  { id: "loan-orig", type: "FEATURE", label: "Loan Origination", x: 380, y: 220, readiness: { Frontend: 0.6, Backend: 0.45, Integration: 0.3, Test: 0.15, Environment: 0.7 }, confidence: "COMMITTED", release: "1.1", sprint: "Sprint 7", hasSpec: true },
  { id: "screen-7", type: "SCREEN", label: "Screen 7", x: 140, y: 100, readiness: { Frontend: 0.7, Backend: 0.5, Integration: 0.35, Test: 0.2, Environment: 0.8 }, confidence: "COMMITTED", release: "1.1", sprint: "Sprint 7", hasSpec: false },
  { id: "e-payment", type: "INTEGRATION", label: "ePayment", x: 380, y: 430, readiness: { Frontend: 0.5, Backend: 0.4, Integration: 0.25, Test: 0.1, Environment: 0.6 }, confidence: "COMMITTED", release: "1.1", sprint: "Sprint 7", hasSpec: true },
  { id: "cash-handling", type: "FEATURE", label: "Cash Handling", x: 140, y: 350, readiness: { Frontend: 0.2, Backend: 0.15, Integration: 0.1, Test: 0.05, Environment: 0.3 }, confidence: "BUBBLE", release: "1.2", sprint: "Sprint 8", hasSpec: false },
  { id: "e-sig", type: "INTEGRATION", label: "E-Signature", x: -60, y: 280, readiness: { Frontend: 0.4, Backend: 0.5, Integration: 0.2, Test: 0.1, Environment: 0.5 }, confidence: "COMMITTED", release: "1.1", sprint: "Sprint 7", hasSpec: true },
  { id: "device-int", type: "DEVICE", label: "Devices", x: -60, y: 120, readiness: { Frontend: 0.6, Backend: 0.5, Integration: 0.7, Test: 0.3, Environment: 0.85 }, confidence: "COMMITTED", release: "1.1", sprint: "Sprint 6", hasSpec: false },
  { id: "refinance", type: "FEATURE", label: "Refinance", x: 620, y: 350, readiness: { Frontend: 0, Backend: 0, Integration: 0, Test: 0, Environment: 0 }, confidence: "DEFERRED", release: "Future", sprint: null, hasSpec: false },
  { id: "cash-advance", type: "FEATURE", label: "Cash Advance", x: 620, y: 120, readiness: { Frontend: 0.55, Backend: 0.6, Integration: 0.4, Test: 0.2, Environment: 0.7 }, confidence: "COMMITTED", release: "1.1", sprint: "Sprint 7", hasSpec: false },
];

const EDGES = [
  { from: "loan-orig", to: "screen-7", type: "contains" },
  { from: "loan-orig", to: "cash-advance", type: "contains" },
  { from: "screen-7", to: "device-int", type: "requires" },
  { from: "loan-orig", to: "e-payment", type: "requires" },
  { from: "loan-orig", to: "e-sig", type: "requires" },
  { from: "cash-handling", to: "loan-orig", type: "feeds-into" },
  { from: "refinance", to: "loan-orig", type: "requires" },
  { from: "cash-advance", to: "e-payment", type: "requires" },
];

// ─── Completion Signal Queue (simulates GSD/BMAD/SpecKit signals) ───
const COMPLETION_SIGNALS = [
  // Wave 1 — GSD plans
  { delay: 3000, source: "gsd", plan: "PLAN-0101", task: 1, nodeId: "e-payment", dimension: "Backend", delta: 0.2, commit: "feat(0101): IBillingRepository interface + BillingRecord DTOs", description: "Created IBillingRepository interface and all DTOs" },
  { delay: 5500, source: "gsd", plan: "PLAN-0101", task: 2, nodeId: "e-payment", dimension: "Frontend", delta: 0.15, commit: "feat(0101): BillingAmountDueControl with MV pattern", description: "Billing amount due control renders correctly" },
  { delay: 7000, source: "gsd", plan: "PLAN-0101", task: 3, nodeId: "e-payment", dimension: "Integration", delta: 0.2, commit: "feat(0101): ESB billing retrieval integration", description: "Real-time balance retrieval via ESB wired up" },
  { delay: 9500, source: "gsd", plan: "PLAN-0102", task: 1, nodeId: "e-payment", dimension: "Frontend", delta: 0.2, commit: "feat(0102): CreditCardPaymentControl state machine", description: "CC payment component with 5-state OnlinePaymentState" },
  { delay: 11000, source: "gsd", plan: "PLAN-0102", task: 2, nodeId: "e-payment", dimension: "Test", delta: 0.25, commit: "test(0102): CC field validation (8 rules)", description: "All 8 CC field validation test cases passing" },
  { delay: 13000, source: "gsd", plan: "PLAN-0102", task: 3, nodeId: "e-payment", dimension: "Frontend", delta: 0.1, commit: "feat(0102): CC review page with masked display", description: "Credit card review shows last 4 digits only" },

  // E-Signature progress
  { delay: 4000, source: "bmad", plan: "STORY-E01", task: 1, nodeId: "e-sig", dimension: "Frontend", delta: 0.2, commit: "feat(e-sig): skeleton + view model", description: "E-signature skeleton and view model complete" },
  { delay: 8000, source: "bmad", plan: "STORY-E02", task: 1, nodeId: "e-sig", dimension: "Backend", delta: 0.15, commit: "feat(e-sig): signature service integration", description: "Signature service connected to workflow advisor" },
  { delay: 12000, source: "bmad", plan: "STORY-E03", task: 1, nodeId: "e-sig", dimension: "Integration", delta: 0.25, commit: "feat(e-sig): LUV update + device integration", description: "LUV service update and device signing wired" },

  // Screen 7 progress
  { delay: 6000, source: "speckit", plan: "TASK-S7-01", task: 1, nodeId: "screen-7", dimension: "Frontend", delta: 0.15, commit: "feat(screen7): application sections populated", description: "Screen 7 application sections rendering" },
  { delay: 10000, source: "speckit", plan: "TASK-S7-02", task: 1, nodeId: "screen-7", dimension: "Backend", delta: 0.2, commit: "feat(screen7): customer card DTO + service", description: "Customer card data service complete" },

  // Wave 2 — payment processing
  { delay: 15000, source: "gsd", plan: "PLAN-0201", task: 1, nodeId: "e-payment", dimension: "Integration", delta: 0.2, commit: "feat(0201): CC payment processing via ESB", description: "ProcessCreditCardPayment handles all 5 response types" },
  { delay: 17000, source: "gsd", plan: "PLAN-0201", task: 2, nodeId: "e-payment", dimension: "Integration", delta: 0.15, commit: "feat(0201): ACH payment processing via ESB", description: "ProcessAchPayment handles all 4 response types" },
  { delay: 19000, source: "gsd", plan: "PLAN-0201", task: 3, nodeId: "e-payment", dimension: "Frontend", delta: 0.1, commit: "feat(0201): confirmation + printable views", description: "CC and ACH confirmation pages with print support" },
  { delay: 21000, source: "gsd", plan: "PLAN-0202", task: 1, nodeId: "e-payment", dimension: "Frontend", delta: 0.05, commit: "feat(0202): rejection pages for CC + ACH", description: "All rejection types display correctly" },
  { delay: 22500, source: "gsd", plan: "PLAN-0202", task: 2, nodeId: "e-payment", dimension: "Test", delta: 0.3, commit: "test(0202): navigation flow verification", description: "Continue/Edit/Cancel/Submit all navigate correctly" },

  // Wave 3 — missing screens + E2E
  { delay: 25000, source: "gsd", plan: "PLAN-0301", task: 1, nodeId: "e-payment", dimension: "Frontend", delta: 0.05, commit: "feat(0301): 6 missing screens designed + implemented", description: "ACH Review/Confirm, Rejected CC/ACH, Printable views all complete" },
  { delay: 27000, source: "gsd", plan: "PLAN-0301", task: 2, nodeId: "e-payment", dimension: "Test", delta: 0.25, commit: "test(0301): E2E integration tests passing", description: "Full CC and ACH happy + error paths pass end-to-end" },
  { delay: 28500, source: "gsd", plan: "PLAN-0301", task: 3, nodeId: "e-payment", dimension: "Environment", delta: 0.2, commit: "feat(0301): duplicate payment detection", description: "Duplicate submission detection for CC and ACH" },

  // Device integration
  { delay: 14000, source: "speckit", plan: "TASK-DV-01", task: 1, nodeId: "device-int", dimension: "Test", delta: 0.3, commit: "test(device): scanner + printer integration tests", description: "Document scanner and check printer verified" },
  { delay: 20000, source: "speckit", plan: "TASK-DV-02", task: 1, nodeId: "device-int", dimension: "Integration", delta: 0.15, commit: "feat(device): webcam + signature pad wired", description: "All device types integrated and tested" },

  // Cash Advance
  { delay: 16000, source: "gsd", plan: "PLAN-CA01", task: 1, nodeId: "cash-advance", dimension: "Frontend", delta: 0.2, commit: "feat(ca): cash advance entry screens", description: "Cash advance new customer flow complete" },
  { delay: 23000, source: "gsd", plan: "PLAN-CA02", task: 1, nodeId: "cash-advance", dimension: "Backend", delta: 0.2, commit: "feat(ca): cash advance service layer", description: "Cash advance processing service complete" },
  { delay: 26000, source: "gsd", plan: "PLAN-CA03", task: 1, nodeId: "cash-advance", dimension: "Test", delta: 0.35, commit: "test(ca): cash advance E2E", description: "Cash advance new + existing customer tests pass" },
];

// ─── Propagation Rules ───
function computePropagation(nodes, edges, changedNodeId) {
  const effects = [];
  // Find nodes that depend on the changed node
  edges.forEach(edge => {
    if (edge.to === changedNodeId && edge.type === "requires") {
      const parent = nodes.find(n => n.id === edge.from);
      const dep = nodes.find(n => n.id === changedNodeId);
      if (parent && dep) {
        const depReadiness = avg(dep.readiness);
        const wasBlocking = depReadiness < 0.5;
        const nowUnblocked = depReadiness >= 0.5;
        if (wasBlocking && nowUnblocked) {
          effects.push({
            type: "unblocked",
            nodeId: parent.id,
            nodeLabel: parent.label,
            byNodeId: changedNodeId,
            byNodeLabel: dep.label,
            message: `${parent.label} unblocked — dependency "${dep.label}" reached ${Math.round(depReadiness * 100)}% readiness`,
          });
        }
        // Check if all dependencies are now green → parent could be promoted
        const allDeps = edges.filter(e => e.from === parent.id && e.type === "requires").map(e => nodes.find(n => n.id === e.to));
        const allDepsReady = allDeps.every(d => d && avg(d.readiness) >= 0.7);
        if (allDepsReady && parent.confidence === "BUBBLE") {
          effects.push({
            type: "promotion",
            nodeId: parent.id,
            nodeLabel: parent.label,
            message: `${parent.label} eligible for promotion: BUBBLE → COMMITTED (all dependencies ≥70%)`,
          });
        }
      }
    }
  });
  return effects;
}

// ─── Graph Canvas (compact) ───
function GraphCanvas({ nodes, selectedId, onSelect, offset, flashNodeId }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <defs>
          <marker id="ar" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="7" markerHeight="5" orient="auto"><path d="M0,0 L10,3 L0,6" fill={C.red} opacity="0.5" /></marker>
          <marker id="af" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="7" markerHeight="5" orient="auto"><path d="M0,0 L10,3 L0,6" fill={C.blue} opacity="0.5" /></marker>
          <marker id="ac" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="7" markerHeight="5" orient="auto"><path d="M0,0 L10,3 L0,6" fill={C.textDim} opacity="0.4" /></marker>
        </defs>
        {EDGES.map((e, i) => {
          const f = nodes.find(n => n.id === e.from), t = nodes.find(n => n.id === e.to);
          if (!f || !t) return null;
          const fx = f.x + offset.x + 80, fy = f.y + offset.y + 28, tx = t.x + offset.x + 80, ty = t.y + offset.y + 28;
          const col = e.type === "requires" ? C.red : e.type === "contains" ? C.textDim : C.blue;
          const mk = e.type === "requires" ? "ar" : e.type === "contains" ? "ac" : "af";
          return <line key={i} x1={fx} y1={fy} x2={tx} y2={ty} stroke={col} strokeWidth={e.type === "contains" ? 1 : 1.5} strokeDasharray={e.type === "contains" ? "4,4" : e.type === "requires" ? "6,3" : "none"} opacity={0.35} markerEnd={`url(#${mk})`} />;
        })}
      </svg>
      {nodes.map(node => {
        const nt = NTYPES[node.type], o = avg(node.readiness), sel = node.id === selectedId, flash = node.id === flashNodeId;
        const conf = CONF[node.confidence];
        return (
          <div key={node.id} onClick={() => onSelect(node.id)} style={{
            position: "absolute", left: node.x + offset.x, top: node.y + offset.y, width: 160,
            background: sel ? C.hover : C.surface, border: `1.5px solid ${flash ? C.green : sel ? nt.color : C.border}`,
            borderRadius: 8, padding: "7px 10px", cursor: "pointer",
            transition: "border-color 0.3s, box-shadow 0.3s",
            boxShadow: flash ? `0 0 20px ${C.green}30, 0 0 40px ${C.green}10` : sel ? `0 0 20px ${nt.color}15` : "0 2px 6px #00000030",
            zIndex: sel ? 10 : flash ? 9 : 1,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: nt.color }}>{nt.icon}</span>
              <span style={{ fontSize: 8, color: nt.color, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{nt.label}</span>
              {node.hasSpec && <span style={{ marginLeft: "auto", fontSize: 7, padding: "1px 4px", borderRadius: 3, background: C.accentDim, color: C.accent, fontWeight: 700 }}>SPEC</span>}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 5, lineHeight: 1.3 }}>{node.label}</div>
            <div style={{ display: "flex", gap: 2, marginBottom: 5 }}>
              {DIMS.map(d => <div key={d} style={{ flex: 1, height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: `${node.readiness[d] * 100}%`, background: rColor(node.readiness[d]), borderRadius: 2, transition: "width 0.6s ease" }} /></div>)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, color: conf.color, background: conf.bg, fontWeight: 600 }}>{conf.label}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: rColor(o), fontFamily: "'JetBrains Mono', monospace", transition: "color 0.3s" }}>{Math.round(o * 100)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Agent Activity Feed ───
function AgentFeed({ events, isRunning }) {
  const feedRef = useRef(null);
  useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }, [events]);

  const sourceColors = { gsd: "#10b981", bmad: "#8b5cf6", speckit: "#3b82f6" };
  const sourceLabels = { gsd: "GSD", bmad: "BMAD", speckit: "SpecKit" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: isRunning ? C.green : C.textDim, boxShadow: isRunning ? `0 0 8px ${C.green}` : "none", transition: "all 0.3s" }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>Reconciliation Agent</span>
        <span style={{ fontSize: 9, color: C.textMuted, marginLeft: "auto" }}>{events.length} events</span>
      </div>
      <div ref={feedRef} style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {events.length === 0 && (
          <div style={{ padding: "20px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.textMuted }}>Press "Start Simulation" to watch agents execute and reconcile</div>
          </div>
        )}
        {events.map((event, i) => (
          <div key={i} style={{ padding: "6px 14px", borderBottom: `1px solid ${C.border}`, transition: "background 0.3s", background: i === events.length - 1 ? `${C.green}06` : "transparent" }}>
            {event.type === "completion" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 8, fontFamily: "monospace", color: C.textDim }}>{event.time}</span>
                  <Badge color={sourceColors[event.source]} bg={`${sourceColors[event.source]}20`}>{sourceLabels[event.source]}</Badge>
                  <span style={{ fontSize: 9, fontFamily: "monospace", color: C.textMuted }}>{event.plan}</span>
                </div>
                <div style={{ fontSize: 10, color: C.text, marginBottom: 2, lineHeight: 1.4 }}>{event.description}</div>
                <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: C.green, opacity: 0.7 }}>{event.commit}</div>
              </>
            )}
            {event.type === "readiness_update" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 8, fontFamily: "monospace", color: C.textDim }}>{event.time}</span>
                <span style={{ fontSize: 10, color: C.cyan }}>↑</span>
                <span style={{ fontSize: 10, color: C.text }}>
                  <span style={{ fontWeight: 600 }}>{event.nodeLabel}</span>
                  <span style={{ color: C.textMuted }}> · {event.dimension} </span>
                  <span style={{ fontFamily: "monospace", color: C.textMuted }}>{event.from}%</span>
                  <span style={{ color: C.green }}> → </span>
                  <span style={{ fontFamily: "monospace", color: C.green, fontWeight: 700 }}>{event.to}%</span>
                </span>
              </div>
            )}
            {event.type === "propagation" && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "2px 0" }}>
                <span style={{ fontSize: 8, fontFamily: "monospace", color: C.textDim }}>{event.time}</span>
                <span style={{ fontSize: 10, color: event.subtype === "unblocked" ? C.yellow : C.purple }}>
                  {event.subtype === "unblocked" ? "🔓" : "⬆"}
                </span>
                <span style={{ fontSize: 10, color: event.subtype === "unblocked" ? C.yellow : C.purple, lineHeight: 1.4 }}>{event.message}</span>
              </div>
            )}
            {event.type === "overall" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 8, fontFamily: "monospace", color: C.textDim }}>{event.time}</span>
                <span style={{ fontSize: 10, color: C.accent }}>◆</span>
                <span style={{ fontSize: 10, color: C.text }}>
                  <span style={{ fontWeight: 600 }}>{event.nodeLabel}</span>
                  <span style={{ color: C.textMuted }}> overall </span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: rColor(event.value / 100) }}>{event.value}%</span>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Release Probability (live) ───
function LiveReleaseProbability({ nodes }) {
  const releases = useMemo(() => {
    const m = {};
    nodes.forEach(n => {
      const r = n.release || "?";
      if (!m[r]) m[r] = [];
      m[r].push(n);
    });
    return m;
  }, [nodes]);

  return (
    <div style={{ padding: "10px 14px" }}>
      <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>Release Probability (Live)</div>
      {Object.entries(releases).sort(([a],[b]) => a.localeCompare(b)).map(([name, rNodes]) => {
        const committed = rNodes.filter(n => n.confidence === "COMMITTED");
        const avgReady = committed.length > 0 ? committed.reduce((s, n) => s + avg(n.readiness), 0) / committed.length : 0;
        const prob = Math.min(99, Math.round(committed.length / rNodes.length * avgReady * 100));
        return (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.purple, width: 50 }}>v{name}</span>
            <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${prob}%`, background: prob > 70 ? C.green : prob > 40 ? C.yellow : C.red, borderRadius: 3, transition: "width 0.8s ease" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: prob > 70 ? C.green : prob > 40 ? C.yellow : C.red, fontFamily: "'JetBrains Mono', monospace", width: 36, textAlign: "right", transition: "color 0.3s" }}>{prob}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main App ───
export default function ForgeApp() {
  const [nodes, setNodes] = useState(() => JSON.parse(JSON.stringify(INITIAL_NODES)));
  const [events, setEvents] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [flashNodeId, setFlashNodeId] = useState(null);
  const [offset, setOffset] = useState({ x: 240, y: 80 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [view, setView] = useState("live");
  const canvasRef = useRef(null);
  const timersRef = useRef([]);

  const selectedNode = nodes.find(n => n.id === selectedId);

  const startSimulation = useCallback(() => {
    // Reset
    setNodes(JSON.parse(JSON.stringify(INITIAL_NODES)));
    setEvents([]);
    setIsRunning(true);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    COMPLETION_SIGNALS.forEach(signal => {
      const timer = setTimeout(() => {
        setNodes(prev => {
          const updated = prev.map(n => {
            if (n.id === signal.nodeId) {
              const newReadiness = { ...n.readiness };
              newReadiness[signal.dimension] = Math.min(1, newReadiness[signal.dimension] + signal.delta);
              return { ...n, readiness: newReadiness };
            }
            return n;
          });

          // Check propagation
          const changedNode = updated.find(n => n.id === signal.nodeId);
          const propagations = computePropagation(updated, EDGES, signal.nodeId);

          // Auto-promote bubbles if all deps ready
          propagations.forEach(p => {
            if (p.type === "promotion") {
              const idx = updated.findIndex(n => n.id === p.nodeId);
              if (idx >= 0) updated[idx] = { ...updated[idx], confidence: "COMMITTED" };
            }
          });

          // Add events
          const now = ts();
          const newEvents = [];
          newEvents.push({ type: "completion", time: now, source: signal.source, plan: signal.plan, commit: signal.commit, description: signal.description });

          const oldNode = prev.find(n => n.id === signal.nodeId);
          const fromVal = Math.round(oldNode.readiness[signal.dimension] * 100);
          const toVal = Math.round(Math.min(1, oldNode.readiness[signal.dimension] + signal.delta) * 100);
          newEvents.push({ type: "readiness_update", time: now, nodeId: signal.nodeId, nodeLabel: changedNode.label, dimension: signal.dimension, from: fromVal, to: toVal });

          const newOverall = Math.round(avg(updated.find(n => n.id === signal.nodeId).readiness) * 100);
          newEvents.push({ type: "overall", time: now, nodeId: signal.nodeId, nodeLabel: changedNode.label, value: newOverall });

          propagations.forEach(p => {
            newEvents.push({ type: "propagation", time: now, subtype: p.type, nodeId: p.nodeId, message: p.message });
          });

          setEvents(prev => [...prev, ...newEvents]);
          return updated;
        });

        // Flash the node
        setFlashNodeId(signal.nodeId);
        setTimeout(() => setFlashNodeId(null), 1200);
      }, signal.delay);
      timersRef.current.push(timer);
    });

    // End simulation
    const endTimer = setTimeout(() => setIsRunning(false), 30000);
    timersRef.current.push(endTimer);
  }, []);

  const resetSimulation = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setNodes(JSON.parse(JSON.stringify(INITIAL_NODES)));
    setEvents([]);
    setIsRunning(false);
    setFlashNodeId(null);
  }, []);

  useEffect(() => { return () => timersRef.current.forEach(clearTimeout); }, []);

  const onMouseDown = (e) => { if (e.target === canvasRef.current) { setDragging(true); setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y }); }};
  const onMouseMove = (e) => { if (dragging) setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const onMouseUp = () => setDragging(false);

  return (
    <div style={{ width: "100%", height: "100vh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'Inter', -apple-system, sans-serif", color: C.text, overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: 5, background: `linear-gradient(135deg, ${C.accent}, #fb923c)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>F</div>
          <span style={{ fontSize: 13, fontWeight: 700 }}>FORGE</span>
          <span style={{ fontSize: 8, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Live Reconciliation</span>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isRunning ? C.green : C.textDim, boxShadow: isRunning ? `0 0 6px ${C.green}` : "none", marginLeft: 4 }} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={isRunning ? resetSimulation : startSimulation} style={{
            padding: "5px 14px", borderRadius: 5, border: `1px solid ${isRunning ? C.red : C.green}40`,
            background: isRunning ? C.redDim : C.greenDim, color: isRunning ? C.red : C.green,
            fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>
            {isRunning ? "⏹ Stop" : "▶ Start Simulation"}
          </button>
        </div>
      </div>

      {/* Main: Graph + Agent Feed */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Graph Canvas */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <div ref={canvasRef} style={{ width: "100%", height: "100%", cursor: dragging ? "grabbing" : "grab" }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1,
              backgroundImage: `radial-gradient(circle, ${C.textDim} 1px, transparent 1px)`,
              backgroundSize: "24px 24px", backgroundPosition: `${offset.x % 24}px ${offset.y % 24}px`, pointerEvents: "none" }} />
            <GraphCanvas nodes={nodes} selectedId={selectedId} onSelect={setSelectedId} offset={offset} flashNodeId={flashNodeId} />
          </div>

          {/* Release probability overlay */}
          <div style={{ position: "absolute", bottom: 14, left: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, width: 260, overflow: "hidden" }}>
            <LiveReleaseProbability nodes={nodes} />
          </div>

          {/* Legend */}
          <div style={{ position: "absolute", top: 14, left: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 9, color: C.textMuted }}>
            <span style={{ color: C.textDim }}>┈</span> contains · <span style={{ color: C.red }}>╌</span> requires · <span style={{ color: C.blue }}>─</span> feeds-into
            {!isRunning && events.length === 0 && <span style={{ color: C.green, marginLeft: 8 }}>Press ▶ Start</span>}
          </div>

          {/* Selected node detail */}
          {selectedNode && (
            <div style={{ position: "absolute", top: 14, right: 14, width: 240, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, color: NTYPES[selectedNode.type].color }}>{NTYPES[selectedNode.type].icon}</span>
                    <span style={{ fontSize: 8, color: NTYPES[selectedNode.type].color, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{NTYPES[selectedNode.type].label}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{selectedNode.label}</div>
                </div>
                <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 14, cursor: "pointer", padding: 0 }}>×</button>
              </div>
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                <Badge color={CONF[selectedNode.confidence].color} bg={CONF[selectedNode.confidence].bg}>{CONF[selectedNode.confidence].label}</Badge>
                {selectedNode.sprint && <Badge color={C.blue} bg={C.blueDim}>{selectedNode.sprint}</Badge>}
              </div>
              <div style={{ background: C.bg, borderRadius: 6, padding: 10, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", fontWeight: 600 }}>Readiness</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: rColor(avg(selectedNode.readiness)), fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(avg(selectedNode.readiness) * 100)}%</span>
                </div>
                {DIMS.map(d => (
                  <div key={d} style={{ marginBottom: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 8, color: C.textMuted, textTransform: "uppercase" }}>{d}</span>
                      <span style={{ fontSize: 8, color: rColor(selectedNode.readiness[d]), fontWeight: 600, fontFamily: "monospace" }}>{Math.round(selectedNode.readiness[d] * 100)}%</span>
                    </div>
                    <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${selectedNode.readiness[d] * 100}%`, background: rColor(selectedNode.readiness[d]), borderRadius: 2, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Agent Activity Feed */}
        <div style={{ width: 380, borderLeft: `1px solid ${C.border}`, background: C.surface, display: "flex", flexDirection: "column" }}>
          <AgentFeed events={events} isRunning={isRunning} />
        </div>
      </div>
    </div>
  );
}
