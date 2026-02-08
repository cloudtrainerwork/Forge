import { useState, useMemo, useRef, useCallback } from "react";

// ─── FORGE: Functional Orchestration for Release-Grade Execution ───
// With Shovel-Ready Specs + Agentic Code Export

const C = {
  bg: "#08090d", surface: "#111219", surfaceAlt: "#161822", hover: "#1c1e2d",
  border: "#1f2235", borderActive: "#3b4068", text: "#e4e6f2", textMuted: "#6d7196",
  textDim: "#3a3e5c", accent: "#f97316", accentDim: "#f9731620", green: "#22c55e",
  greenDim: "#22c55e20", yellow: "#eab308", yellowDim: "#eab30820", red: "#ef4444",
  redDim: "#ef444420", blue: "#3b82f6", blueDim: "#3b82f620", purple: "#a855f7",
  purpleDim: "#a855f720", cyan: "#06b6d4", cyanDim: "#06b6d420",
};

const DIMS = ["Frontend", "Backend", "Integration", "Test", "Environment"];
const CONF = {
  COMMITTED: { label: "Committed", color: C.green, bg: C.greenDim },
  BUBBLE: { label: "On the Bubble", color: C.yellow, bg: C.yellowDim },
  DEFERRED: { label: "Deferred", color: C.textMuted, bg: "#1e2040" },
};
const NTYPES = {
  FEATURE: { label: "Feature", color: C.accent, icon: "◆" },
  SERVICE: { label: "Service", color: C.blue, icon: "⬡" },
  SCREEN: { label: "Screen", color: C.purple, icon: "◻" },
  INTEGRATION: { label: "Integration", color: C.cyan, icon: "⬢" },
  TEST: { label: "Test Suite", color: C.green, icon: "✓" },
  DEVICE: { label: "Device", color: C.yellow, icon: "◈" },
};

const SPEC_SECTIONS = [
  { id: "requirements", label: "Requirements", icon: "◇", color: C.accent },
  { id: "design", label: "Design", icon: "◻", color: C.purple },
  { id: "frontend", label: "Frontend", icon: "▣", color: C.blue },
  { id: "backend", label: "Backend", icon: "⬡", color: C.cyan },
  { id: "integration", label: "Integration", icon: "⬢", color: C.green },
  { id: "test", label: "Test Cases", icon: "✓", color: C.yellow },
];

// ─── Agentic Export Targets ───
const EXPORT_TARGETS = [
  {
    id: "gsd",
    name: "GSD (Get Shit Done)",
    description: "Atomic plans with max 3 tasks each, XML task format, wave-based parallel execution, fresh sub-agent contexts",
    icon: "⚡",
    color: "#10b981",
    format: "Structured XML plans in .planning/ directory",
    features: ["Max 3 tasks per plan", "Wave-based parallelism", "Git-centric atomic commits", "Fresh 200k context per agent"],
  },
  {
    id: "bmad",
    name: "BMAD Method",
    description: "Multi-agent stories with Analyst → PM → Architect → Scrum Master → Dev flow, hyper-detailed dev stories",
    icon: "🏗",
    color: "#8b5cf6",
    format: "PRD + Architecture + Dev Stories in .bmad/ directory",
    features: ["Role-based agents (PM, Architect, SM, Dev)", "PRD generation", "Architecture docs", "Hyper-detailed dev stories"],
  },
  {
    id: "speckit",
    name: "GitHub Spec Kit",
    description: "Specify → Plan → Tasks → Implement pipeline, agent-agnostic, works with Copilot/Claude/Gemini/Cursor",
    icon: "📋",
    color: "#3b82f6",
    format: "Spec + Plan + Tasks in .specify/ directory",
    features: ["Agent-agnostic (any AI tool)", "Constitution + Spec + Plan", "Research docs", "Implementation tasks"],
  },
  {
    id: "claude-md",
    name: "Claude Code (CLAUDE.md)",
    description: "Direct Claude Code format — CLAUDE.md project context + task breakdown for conversational agentic coding",
    icon: "🤖",
    color: "#f97316",
    format: "CLAUDE.md + task files",
    features: ["CLAUDE.md project context", "Sub-agent delegation", "Permission-aware", "TDD-friendly"],
  },
  {
    id: "generic",
    name: "Generic Markdown Plans",
    description: "Universal spec-driven format compatible with any AI coding tool — Cursor, Windsurf, Cline, Aider, etc.",
    icon: "📄",
    color: "#6b7280",
    format: "Markdown spec + plan + task files",
    features: ["Universal compatibility", "No framework lock-in", "Human-readable", "Version-controlled"],
  },
];

// ─── Sample Spec Data (from uploaded ePayment dev package) ───
const SAMPLE_SPEC = {
  nodeId: "e-payment",
  title: "ePayment - Online Payment Processing",
  version: "3.0",
  sections: {
    requirements: {
      status: "complete",
      items: [
        { type: "goal", content: "Members can make payments via credit card or ACH bank draft. ~300 daily transactions. Business-critical functionality." },
        { type: "precondition", content: "Member must be logged in; SiteMinder must convey role and privilege information" },
        { type: "flow", label: "Main Course — Balance Due", steps: [
          "System presents balance due with contract/invoice breakdown",
          "Actor selects payment method (Credit Card or ACH)",
          "System presents payment entry form for selected method",
          "Actor enters payment information → System validates required fields",
          "System presents payment review/confirmation page",
          "Actor submits → System processes via service provider",
          "On success: display confirmation with printable view",
          "On failure: display rejection reason, return to entry",
        ]},
        { type: "rules", label: "Business Rules", items: [
          "Balance retrieval is real-time from Facets (not Data Mart nightly feed)",
          "Credit card number masked on review/confirmation (last 4 digits only)",
          "Duplicate payment detection required for both CC and ACH",
          "Disclaimer date = system date US CST at time of balance retrieval",
        ]},
      ],
    },
    design: {
      status: "partial",
      screens: [
        { label: "Balance Due", status: "complete" },
        { label: "Credit Card Entry", status: "complete" },
        { label: "Credit Card Review", status: "complete" },
        { label: "Credit Card Confirmation", status: "complete" },
        { label: "ACH Entry", status: "complete" },
        { label: "ACH Review", status: "missing" },
        { label: "ACH Confirmation", status: "missing" },
        { label: "Rejected Credit Card", status: "missing" },
        { label: "Rejected ACH", status: "missing" },
        { label: "Printable CC Confirmation", status: "missing" },
        { label: "Printable ACH Confirmation", status: "missing" },
      ],
      states: ["DisplayPaymentEntryFields", "DisplayPaymentVerification", "DisplayPaymentCancelation", "DisplayPaymentErrors", "DisplayPaymentConfirmation"],
    },
    frontend: {
      status: "complete",
      pattern: "Model-View-Presenter (MVP) for multi-state payment flows; Model-View (MV) for read-only billing display",
      components: [
        { label: "BillingAmountDueControl", pattern: "MV", attrs: ["BillingRepository: IBillingRepository", "CurrentBillingRecord: BillingRecord"] },
        { label: "CreditCardPaymentControl", pattern: "MVP",
          attrs: ["CurrentBillingRecord", "PaymentState: OnlinePaymentState", "Payment", "PaymentResult", "Presenter"],
          events: ["InitView()", "LoadView()", "PaymentCanceled()", "PaymentEntryCompleted()", "PaymentMethodSelected()", "PaymentReset()", "PaymentSubmitted()"],
          methods: ["ChangePaymentState(OnlinePaymentState)", "DisplayErrorMessage(string)", "BindPaymentFields()", "BindPaymentResultFields()"] },
        { label: "AchPaymentControl", pattern: "MVP",
          attrs: ["CurrentBillingRecord", "PaymentState", "Payment", "PaymentResult", "Presenter"],
          events: ["InitView()", "LoadView()", "PaymentCanceled()", "PaymentEntryCompleted()", "PaymentMethodSelected()", "PaymentReset()", "PaymentSubmitted()"],
          methods: ["ChangePaymentState()", "DisplayErrorMessage()", "BindPaymentFields()", "BindPaymentResultFields()"] },
        { label: "OnlinePaymentPresenter",
          attrs: ["Model: IBillingRepository", "View: IOnlinePaymentView"],
          methods: ["AttachEvents()", "OnInitView()", "OnLoadView()", "OnPaymentCanceled()", "OnPaymentEntryCompleted()", "OnPaymentReset()", "OnPaymentSubmitted()"] },
      ],
    },
    backend: {
      status: "complete",
      namespaces: ["Bcbsla.eBilling.Data", "Bcbsla.eBilling.Presentation", "Bcbsla.eBilling.Web.UI", "Bcbsla.eBilling.UnitTests"],
      interfaces: [
        { label: "IBillingRepository", methods: [
          "GetBillingInfo(subscriberID: string): BillingRecord",
          "ProcessAchPayment(payment: AchPayment): PaymentResult",
          "ProcessCreditCardPayment(payment: CreditCardPayment): PaymentResult",
        ]},
      ],
      dtos: [
        { label: "BillingRecord", fields: ["BillingErrorsCollection: List<BillingError>", "BillingItemsCollection: List<BillingLineItem>", "BillingSummary: BillingSummary"] },
        { label: "BillingLineItem", fields: ["AmountDue: double", "BillIdentifier: string", "DueDate: DateTime", "SubscribersCollection: List<SubscriberLineItem>"] },
        { label: "Payment (abstract)", fields: ["BillIdentifier", "PayerFirstName", "PayerLastName", "SubscriberIdentifier", "TransactionOrigin", "TransactionType", "UserIdentifier"] },
        { label: "CreditCardPayment", fields: ["CreditCardNumber", "CreditCardCCV", "CreditCardExpirationDate", "CreditCardAddress", "CreditCardCity", "CreditCardState", "CreditCardZipCode"] },
        { label: "AchPayment", fields: ["AchAccountNumber", "AchRoutingNumber"] },
        { label: "PaymentResult", fields: ["AmountDue", "ConfirmationNumber", "PaymentDate", "PaymentResponseCode", "PaymentResponseDescription", "RejectionReason"] },
      ],
    },
    integration: {
      status: "partial",
      dataFlow: "BizTalk/ESB → wsBilling web service → Facets (Sybase)",
      endpoints: [
        { label: "Balance Retrieval", desc: "Real-time query to Facets via ESB. Not cached." },
        { label: "Payment Processing", desc: "Post payment to service provider via ESB. Returns rejection reason or success." },
      ],
      openQuestions: ["Where does address standardization occur?"],
    },
    test: {
      status: "complete",
      groups: [
        { label: "Balance Due Scenarios", cases: ["No balance due", "One contract/one invoice", "One contract/multiple invoices", "Multiple contracts/multiple invoices"] },
        { label: "CC Field Validation", cases: ["CC Number: required, digits, 15–16 len", "Expiry: required, valid values", "First/Last Name: required, alpha, max 35", "Address: required, max 30", "City: required, max 29", "State: required, valid list", "ZIP: required, digits, 5–9 len"] },
        { label: "ACH Field Validation", cases: ["First/Last Name: required, alpha, max 35", "Routing: required, digits, exactly 9", "Account: required, digits, max 17"] },
        { label: "CC Service Results", cases: ["Payment accepted", "Payment declined", "Fraud detection rejected", "CC not valid rejected", "Duplicate payment rejected"] },
        { label: "ACH Service Results", cases: ["Payment accepted", "Duplicate rejected", "Invalid routing", "Invalid account"] },
        { label: "Navigation & Views", cases: ["Continue/Edit/Cancel/Submit navigation", "Printable CC confirmation", "Printable ACH confirmation"] },
      ],
    },
  },
};

// ─── Generated Plan Examples ───
function generateGSDPlans(spec) {
  return [
    {
      id: "PLAN-0101",
      wave: 1,
      title: "Balance Due Display & Data Layer",
      tasks: [
        { name: "Create IBillingRepository interface and BillingRecord DTOs", files: "src/data/IBillingRepository.ts, src/data/models/*.ts", verify: "Unit tests pass for all DTO serialization", type: "auto" },
        { name: "Implement BillingAmountDueControl with MV pattern", files: "src/components/BillingAmountDue.tsx", verify: "Renders balance due for test subscriber, handles no-balance case", type: "auto" },
        { name: "Wire ESB integration for real-time balance retrieval", files: "src/services/billingService.ts", verify: "curl /api/billing/:id returns correct BillingRecord JSON", type: "auto" },
      ],
    },
    {
      id: "PLAN-0102",
      wave: 1,
      title: "Credit Card Payment Entry & Validation",
      tasks: [
        { name: "Build CreditCardPaymentControl component with state machine", files: "src/components/CreditCardPayment.tsx, src/state/paymentState.ts", verify: "All 5 OnlinePaymentState transitions work correctly", type: "auto" },
        { name: "Implement field-level validation (CC number 15-16 digits, expiry, name, address)", files: "src/validation/creditCardValidation.ts", verify: "All 8 CC field validation test cases pass", type: "auto" },
        { name: "Create credit card review page with masked card display", files: "src/components/CreditCardReview.tsx", verify: "Shows last 4 digits only, all entered data accurate", type: "auto" },
      ],
    },
    {
      id: "PLAN-0103",
      wave: 1,
      title: "ACH Payment Entry & Validation",
      tasks: [
        { name: "Build AchPaymentControl component reusing MVP pattern", files: "src/components/AchPayment.tsx", verify: "State machine mirrors CC flow with ACH-specific fields", type: "auto" },
        { name: "Implement ACH field validation (routing exactly 9, account max 17)", files: "src/validation/achValidation.ts", verify: "All 3 ACH field validation test cases pass", type: "auto" },
      ],
    },
    {
      id: "PLAN-0201",
      wave: 2,
      title: "Payment Processing & Service Provider Integration",
      tasks: [
        { name: "Implement ProcessCreditCardPayment via ESB layer", files: "src/services/paymentService.ts", verify: "Handles: accepted, declined, fraud, invalid, duplicate", type: "auto" },
        { name: "Implement ProcessAchPayment via ESB layer", files: "src/services/paymentService.ts", verify: "Handles: accepted, duplicate, invalid routing, invalid account", type: "auto" },
        { name: "Build confirmation pages with printable view for both CC and ACH", files: "src/components/PaymentConfirmation.tsx", verify: "Confirmation # displayed, printable view renders correctly", type: "auto" },
      ],
    },
    {
      id: "PLAN-0202",
      wave: 2,
      title: "Error Handling, Rejection Flows & Navigation",
      tasks: [
        { name: "Build rejection display pages for all CC and ACH error types", files: "src/components/PaymentRejection.tsx", verify: "Each rejection type shows correct message and returns to entry", type: "auto" },
        { name: "Implement full navigation flow (Continue, Edit, Cancel, Submit)", files: "src/navigation/paymentFlow.ts", verify: "All navigation paths per interaction diagram verified", type: "auto" },
      ],
    },
    {
      id: "PLAN-0301",
      wave: 3,
      title: "Integration Testing & Missing Screens",
      tasks: [
        { name: "Design and implement 6 missing screens (ACH Review/Confirm, Rejected CC/ACH, Printable CC/ACH)", files: "src/components/missing/*.tsx", verify: "All 11 screens in inventory marked 'complete'", type: "auto" },
        { name: "End-to-end integration tests for full payment flows", files: "tests/e2e/payment.spec.ts", verify: "Both CC and ACH happy + error paths pass E2E", type: "auto" },
        { name: "Duplicate payment detection for CC and ACH", files: "src/services/duplicateDetection.ts", verify: "Duplicate submission within window triggers rejection", type: "auto" },
      ],
    },
  ];
}

function generateBMADStories(spec) {
  return [
    { id: "STORY-001", epic: "Balance Display", role: "Dev", title: "Implement Billing Amount Due Web Part (MV Pattern)",
      acceptance: ["BillingRecord DTO matches spec fields exactly", "Real-time Facets query (not Data Mart)", "Collapsible tree view for contracts/invoices", "Disclaimer date shows US CST system date"],
      context: "Uses Model-View pattern per architecture doc. IBillingRepository provides data layer abstraction via SharePoint Service Locator IoC." },
    { id: "STORY-002", epic: "Credit Card Payment", role: "Dev", title: "Build Credit Card Payment MVP Flow (5 states)",
      acceptance: ["OnlinePaymentState enum drives all transitions", "OnlinePaymentPresenter wires all 7 view events", "Field validation: CC 15-16 digits, expiry current+10 years, name max 35, address max 30, ZIP 5-9", "Masked display on review (last 4 only)"],
      context: "Model-View-Presenter pattern. Presenter as Supervising Controller. Service Locator for IoC. All events fire through AttachEvents()." },
    { id: "STORY-003", epic: "ACH Payment", role: "Dev", title: "Build ACH Payment MVP Flow (mirrors CC structure)",
      acceptance: ["Routing number: exactly 9 digits", "Account number: max 17 digits", "Duplicate payment detection", "Same state machine as CC flow"],
      context: "Reuse OnlinePaymentPresenter pattern. AchPayment extends Payment abstract class. ProcessAchPayment on IBillingRepository." },
    { id: "STORY-004", epic: "Service Provider", role: "Dev", title: "ESB Payment Processing Integration",
      acceptance: ["CC: handles accepted/declined/fraud/invalid/duplicate", "ACH: handles accepted/duplicate/invalid routing/invalid account", "PaymentResult DTO populated correctly on all paths", "Error messages displayed to user on rejection"],
      context: "BizTalk/ESB → wsBilling web service → Facets. Real-time, no caching. OPEN QUESTION: Address standardization location TBD." },
  ];
}

function generateSpecKitOutput(spec) {
  return {
    constitution: `# Project Constitution\n\n## Principles\n- Real-time billing data (no stale cache)\n- All payment fields validated before submission\n- Credit card/account numbers always masked in review/confirmation\n- Duplicate payment detection is mandatory\n- MVP pattern for multi-state flows, MV for read-only\n\n## Tech Stack\n- Frontend: ASP.NET User Controls (wrapped WebParts)\n- Backend: C# with Repository pattern\n- Integration: BizTalk ESB → wsBilling → Facets (Sybase)\n- Auth: CA SiteMinder\n\n## Constraints\n- ~300 transactions/day, business-critical\n- Legacy system members NOT supported\n- Real-time Facets query required (not Data Mart)`,
    specification: `# ePayment Specification\n\n## User Journeys\n\n### Journey 1: Pay by Credit Card\n1. Member logs in → views balance due\n2. Selects "Credit Card" payment method\n3. Enters CC info (number, expiry, name, address)\n4. Reviews masked CC info → submits\n5. Success: confirmation + printable view\n6. Failure: rejection message → return to entry\n\n### Journey 2: Pay by ACH (Bank Draft)\n1. Member logs in → views balance due\n2. Selects "Bank Account" payment method\n3. Enters ACH info (name, routing, account)\n4. Reviews info → submits\n5. Success: confirmation + printable view\n6. Failure: rejection message → return to entry\n\n### Journey 3: No Balance Due\n1. Member logs in → sees "no balance due" message\n\n## Business Rules\n- Disclaimer date = US CST system date at balance retrieval\n- CC masked to last 4 on review/confirm/print\n- Duplicate payment detection for both CC and ACH\n- Balance retrieved real-time from Facets via ESB`,
    plan: `# Implementation Plan\n\n## Phase 1: Data Layer + Balance Display\n- IBillingRepository interface\n- BillingRecord, BillingLineItem, BillingSummary DTOs\n- BillingAmountDueControl (MV pattern)\n- ESB integration for GetBillingInfo()\n\n## Phase 2: Credit Card Flow\n- CreditCardPayment DTO\n- CreditCardPaymentControl (MVP)\n- OnlinePaymentPresenter\n- Field validation (8 rules)\n- Review + Confirmation + Rejection screens\n\n## Phase 3: ACH Flow\n- AchPayment DTO\n- AchPaymentControl (MVP, mirrors CC)\n- Field validation (3 rules)\n- Review + Confirmation + Rejection screens\n\n## Phase 4: Integration + Polish\n- ProcessCreditCardPayment ESB integration\n- ProcessAchPayment ESB integration\n- Printable views\n- Duplicate detection\n- 6 missing screen designs`,
  };
}

// ─── Utilities ───
const avg = (r) => Object.values(r).reduce((a, b) => a + b, 0) / Object.values(r).length;
const rColor = (v) => v >= 0.8 ? C.green : v >= 0.5 ? C.yellow : v >= 0.2 ? C.accent : C.red;

function Badge({ children, color, bg }) {
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color, background: bg, border: `1px solid ${color}25`, whiteSpace: "nowrap" }}>{children}</span>;
}

// ─── Graph Canvas ───
const NODES = [
  { id: "loan-orig", type: "FEATURE", label: "Loan Origination", x: 400, y: 250, readiness: { Frontend: 0.9, Backend: 0.7, Integration: 0.5, Test: 0.3, Environment: 0.8 }, confidence: "COMMITTED", release: "1.1", sprint: "Sprint 7", hasSpec: true },
  { id: "screen-7", type: "SCREEN", label: "Screen 7", x: 150, y: 120, readiness: { Frontend: 1.0, Backend: 0.8, Integration: 0.6, Test: 0.4, Environment: 0.9 }, confidence: "COMMITTED", release: "1.1", sprint: "Sprint 7", hasSpec: false },
  { id: "cash-advance", type: "FEATURE", label: "Cash Advance", x: 650, y: 120, readiness: { Frontend: 0.85, Backend: 0.9, Integration: 0.7, Test: 0.5, Environment: 0.8 }, confidence: "COMMITTED", release: "1.1", sprint: "Sprint 7", hasSpec: false },
  { id: "e-payment", type: "INTEGRATION", label: "ePayment", x: 400, y: 500, readiness: { Frontend: 0.85, Backend: 0.9, Integration: 0.6, Test: 0.8, Environment: 0.7 }, confidence: "COMMITTED", release: "1.1", sprint: "Sprint 7", hasSpec: true },
  { id: "cash-handling", type: "FEATURE", label: "Cash Handling", x: 150, y: 400, readiness: { Frontend: 0.3, Backend: 0.4, Integration: 0.2, Test: 0.1, Environment: 0.5 }, confidence: "BUBBLE", release: "1.2", sprint: "Sprint 8", hasSpec: false },
  { id: "e-sig", type: "INTEGRATION", label: "E-Signature", x: -80, y: 350, readiness: { Frontend: 0.7, Backend: 0.8, Integration: 0.4, Test: 0.2, Environment: 0.6 }, confidence: "COMMITTED", release: "1.1", sprint: "Sprint 7", hasSpec: true },
  { id: "device-int", type: "DEVICE", label: "Device Integration", x: -80, y: 160, readiness: { Frontend: 0.7, Backend: 0.6, Integration: 0.8, Test: 0.5, Environment: 0.9 }, confidence: "COMMITTED", release: "1.1", sprint: "Sprint 6", hasSpec: false },
  { id: "refinance", type: "FEATURE", label: "Refinance", x: 650, y: 400, readiness: { Frontend: 0, Backend: 0, Integration: 0, Test: 0, Environment: 0 }, confidence: "DEFERRED", release: "Future", sprint: null, hasSpec: false },
];

const EDGES = [
  { from: "loan-orig", to: "screen-7", type: "contains" },
  { from: "loan-orig", to: "cash-advance", type: "contains" },
  { from: "screen-7", to: "device-int", type: "requires" },
  { from: "loan-orig", to: "e-payment", type: "requires" },
  { from: "loan-orig", to: "e-sig", type: "requires" },
  { from: "cash-handling", to: "loan-orig", type: "feeds-into" },
  { from: "refinance", to: "loan-orig", type: "requires" },
];

function GraphCanvas({ selectedId, onSelect, offset }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <defs>
          <marker id="ar" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="7" markerHeight="5" orient="auto"><path d="M0,0 L10,3 L0,6" fill={C.red} opacity="0.5" /></marker>
          <marker id="af" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="7" markerHeight="5" orient="auto"><path d="M0,0 L10,3 L0,6" fill={C.blue} opacity="0.5" /></marker>
          <marker id="ac" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="7" markerHeight="5" orient="auto"><path d="M0,0 L10,3 L0,6" fill={C.textDim} opacity="0.4" /></marker>
        </defs>
        {EDGES.map((e, i) => {
          const f = NODES.find(n => n.id === e.from), t = NODES.find(n => n.id === e.to);
          if (!f || !t) return null;
          const fx = f.x + offset.x + 80, fy = f.y + offset.y + 28, tx = t.x + offset.x + 80, ty = t.y + offset.y + 28;
          const col = e.type === "requires" ? C.red : e.type === "contains" ? C.textDim : C.blue;
          const mk = e.type === "requires" ? "ar" : e.type === "contains" ? "ac" : "af";
          return <line key={i} x1={fx} y1={fy} x2={tx} y2={ty} stroke={col} strokeWidth={e.type === "contains" ? 1 : 1.5} strokeDasharray={e.type === "contains" ? "4,4" : e.type === "requires" ? "6,3" : "none"} opacity={0.35} markerEnd={`url(#${mk})`} />;
        })}
      </svg>
      {NODES.map(node => {
        const nt = NTYPES[node.type], o = avg(node.readiness), sel = node.id === selectedId, conf = CONF[node.confidence];
        return (
          <div key={node.id} onClick={() => onSelect(node.id)} style={{
            position: "absolute", left: node.x + offset.x, top: node.y + offset.y, width: 160,
            background: sel ? C.hover : C.surface, border: `1px solid ${sel ? nt.color : C.border}`,
            borderRadius: 8, padding: "7px 10px", cursor: "pointer", transition: "all 0.15s",
            boxShadow: sel ? `0 0 24px ${nt.color}18` : "0 2px 8px #00000040", zIndex: sel ? 10 : 1,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: nt.color }}>{nt.icon}</span>
              <span style={{ fontSize: 8, color: nt.color, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{nt.label}</span>
              {node.hasSpec && <span style={{ marginLeft: "auto", fontSize: 7, padding: "1px 4px", borderRadius: 3, background: C.accentDim, color: C.accent, fontWeight: 700 }}>SPEC</span>}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.text, marginBottom: 5, lineHeight: 1.3 }}>{node.label}</div>
            <div style={{ display: "flex", gap: 2, marginBottom: 5 }}>
              {DIMS.map(d => <div key={d} style={{ flex: 1, height: 2.5, background: C.border, borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: `${node.readiness[d] * 100}%`, background: rColor(node.readiness[d]), borderRadius: 2 }} /></div>)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, color: conf.color, background: conf.bg, fontWeight: 600 }}>{conf.label}</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: rColor(o), fontFamily: "monospace" }}>{Math.round(o * 100)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Agentic Export View ───
function AgenticExportView({ spec, onBack }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const gsdPlans = useMemo(() => generateGSDPlans(spec), [spec]);
  const bmadStories = useMemo(() => generateBMADStories(spec), [spec]);
  const specKitOutput = useMemo(() => generateSpecKitOutput(spec), [spec]);

  const totalTestCases = spec.sections.test.groups.reduce((s, g) => s + g.cases.length, 0);
  const totalDTOs = spec.sections.backend.dtos.length;
  const totalComponents = spec.sections.frontend.components.length;
  const totalScreens = spec.sections.design.screens.length;
  const missingScreens = spec.sections.design.screens.filter(s => s.status === "missing").length;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left: Export Target Selector */}
      <div style={{ width: 300, borderRight: `1px solid ${C.border}`, background: C.surface, overflowY: "auto", flexShrink: 0 }}>
        <div style={{ padding: "16px 16px 12px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 11, cursor: "pointer", padding: 0, marginBottom: 12 }}>← Back</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16, color: C.accent }}>⚡</span>
            <span style={{ fontSize: 10, color: C.accent, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Agentic Export</span>
          </div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>{spec.title}</h2>
          <p style={{ fontSize: 11, color: C.textMuted, margin: "0 0 16px" }}>Transform this shovel-ready spec into executable plans for AI coding agents</p>
        </div>

        {/* Spec summary stats */}
        <div style={{ margin: "0 16px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            [totalComponents, "Components", C.blue],
            [totalDTOs, "DTOs", C.cyan],
            [totalScreens - missingScreens + "/" + totalScreens, "Screens", C.purple],
            [totalTestCases, "Test Cases", C.yellow],
          ].map(([val, label, col], i) => (
            <div key={i} style={{ background: C.bg, borderRadius: 6, padding: "6px 10px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: col, fontFamily: "monospace" }}>{val}</div>
              <div style={{ fontSize: 8, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Export targets */}
        <div style={{ padding: "0 16px" }}>
          <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>Export Target</div>
        </div>
        {EXPORT_TARGETS.map(target => {
          const sel = selectedTarget?.id === target.id;
          return (
            <button key={target.id} onClick={() => { setSelectedTarget(target); setShowPreview(true); }}
              style={{
                display: "flex", alignItems: "flex-start", gap: 10, width: "100%", padding: "10px 16px",
                background: sel ? C.hover : "transparent", border: "none",
                borderLeft: `3px solid ${sel ? target.color : "transparent"}`,
                cursor: "pointer", textAlign: "left", transition: "all 0.1s",
              }}>
              <span style={{ fontSize: 18, marginTop: 1 }}>{target.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: sel ? C.text : C.textMuted }}>{target.name}</div>
                <div style={{ fontSize: 10, color: C.textDim, lineHeight: 1.4, marginTop: 2 }}>{target.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Right: Preview */}
      <div style={{ flex: 1, overflowY: "auto", background: C.bg }}>
        {!showPreview || !selectedTarget ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: 40 }}>
            <div style={{ textAlign: "center", maxWidth: 500 }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>⚡</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>Select an Export Target</h3>
              <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, margin: 0 }}>
                FORGE transforms your shovel-ready spec into executable plans optimized for each framework's context engineering model.
                The spec's six dimensions (requirements, design, frontend, backend, integration, test) are decomposed into the atomic units each tool expects.
              </p>
            </div>
          </div>
        ) : selectedTarget.id === "gsd" ? (
          <GSDPreview plans={gsdPlans} spec={spec} target={selectedTarget} />
        ) : selectedTarget.id === "bmad" ? (
          <BMADPreview stories={bmadStories} target={selectedTarget} />
        ) : selectedTarget.id === "speckit" ? (
          <SpecKitPreview output={specKitOutput} target={selectedTarget} />
        ) : selectedTarget.id === "claude-md" ? (
          <ClaudeMDPreview spec={spec} target={selectedTarget} />
        ) : (
          <GenericPreview spec={spec} target={selectedTarget} />
        )}
      </div>
    </div>
  );
}

function ExportHeader({ target, subtitle }) {
  return (
    <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`, background: C.surface }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>{target.icon}</span>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>{target.name}</h2>
          <div style={{ fontSize: 11, color: C.textMuted }}>{subtitle}</div>
        </div>
        <button style={{ marginLeft: "auto", padding: "6px 16px", borderRadius: 6, border: `1px solid ${target.color}`, background: `${target.color}15`, color: target.color, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          Export Files
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {target.features.map((f, i) => (
          <span key={i} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 3, background: `${target.color}12`, color: target.color, fontWeight: 600, border: `1px solid ${target.color}20` }}>{f}</span>
        ))}
      </div>
    </div>
  );
}

function CodeBlock({ title, content, language = "xml" }) {
  return (
    <div style={{ background: "#0d0e14", border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 12, overflow: "hidden" }}>
      {title && <div style={{ padding: "6px 12px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</div>}
      <pre style={{ margin: 0, padding: 14, fontSize: 11, color: C.text, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{content}</pre>
    </div>
  );
}

function GSDPreview({ plans, spec, target }) {
  const waveColors = { 1: C.green, 2: C.blue, 3: C.purple };
  return (
    <div>
      <ExportHeader target={target} subtitle={`${plans.length} plans across ${Math.max(...plans.map(p => p.wave))} waves · ${plans.reduce((s, p) => s + p.tasks.length, 0)} atomic tasks`} />
      <div style={{ padding: 24 }}>
        {/* Wave visualization */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 10 }}>Execution Waves</div>
          <div style={{ display: "flex", gap: 12 }}>
            {[1, 2, 3].map(wave => {
              const wavePlans = plans.filter(p => p.wave === wave);
              return (
                <div key={wave} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, color: waveColors[wave], fontWeight: 700, marginBottom: 6 }}>WAVE {wave} {wave > 1 ? "(depends on Wave " + (wave - 1) + ")" : "(parallel)"}</div>
                  {wavePlans.map(p => (
                    <div key={p.id} style={{ fontSize: 11, color: C.text, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: C.textMuted, fontFamily: "monospace", marginRight: 6 }}>{p.id}</span>{p.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan details */}
        {plans.map(plan => (
          <div key={plan.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: waveColors[plan.wave], fontWeight: 700 }}>{plan.id}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{plan.title}</span>
              <Badge color={waveColors[plan.wave]} bg={`${waveColors[plan.wave]}20`}>Wave {plan.wave}</Badge>
              <span style={{ marginLeft: "auto", fontSize: 10, color: C.textMuted }}>{plan.tasks.length} tasks</span>
            </div>
            <div style={{ padding: 16 }}>
              <CodeBlock content={plan.tasks.map(t =>
`<task type="${t.type}">
  <n>${t.name}</n>
  <files>${t.files}</files>
  <action>
    Implement per shovel-ready spec. Reference FORGE spec
    sections for exact field validations, DTO shapes, and
    state machine transitions.
  </action>
  <verify>${t.verify}</verify>
  <done>${t.verify}</done>
</task>`
              ).join("\n\n")} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BMADPreview({ stories, target }) {
  return (
    <div>
      <ExportHeader target={target} subtitle={`${stories.length} dev stories with embedded architectural context`} />
      <div style={{ padding: 24 }}>
        <div style={{ background: `${C.purple}08`, border: `1px solid ${C.purpleDim}`, borderRadius: 8, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: C.purple, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>BMAD Agent Flow</div>
          <div style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 11, color: C.text }}>
            {["Analyst → Brief", "PM → PRD", "Architect → Tech Spec", "SM → Stories", "Dev → Code"].map((step, i) => (
              <span key={i}><span style={{ color: C.purple, fontWeight: 600 }}>{step}</span>{i < 4 ? <span style={{ color: C.textDim, margin: "0 4px" }}>→</span> : ""}</span>
            ))}
          </div>
        </div>

        {stories.map(story => (
          <div key={story.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: C.purple, fontWeight: 700 }}>{story.id}</span>
              <Badge color={C.blue} bg={C.blueDim}>{story.epic}</Badge>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{story.title}</span>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 10, color: C.green, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 6 }}>Acceptance Criteria</div>
              {story.acceptance.map((ac, j) => (
                <div key={j} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <span style={{ color: C.green, fontSize: 10, flexShrink: 0, marginTop: 2 }}>✓</span>
                  <span style={{ fontSize: 11, color: C.text, lineHeight: 1.4 }}>{ac}</span>
                </div>
              ))}
              <div style={{ marginTop: 12, padding: 10, background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>Embedded Context (for Dev Agent)</div>
                <p style={{ margin: 0, fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>{story.context}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpecKitPreview({ output, target }) {
  return (
    <div>
      <ExportHeader target={target} subtitle="Constitution + Specification + Plan → ready for /speckit.tasks" />
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 20, fontSize: 11, color: C.text }}>
          {["/speckit.constitution", "/speckit.specify", "/speckit.plan", "/speckit.tasks"].map((cmd, i) => (
            <span key={i}>
              <span style={{ padding: "3px 8px", borderRadius: 4, background: i < 3 ? `${C.green}15` : C.blueDim, color: i < 3 ? C.green : C.blue, fontFamily: "monospace", fontWeight: 600, fontSize: 10 }}>{cmd}</span>
              {i < 3 && <span style={{ color: C.textDim, margin: "0 2px" }}>→</span>}
            </span>
          ))}
        </div>

        <CodeBlock title=".specify/constitution.md" content={output.constitution} />
        <CodeBlock title=".specify/specification.md" content={output.specification} />
        <CodeBlock title=".specify/plan.md" content={output.plan} />
      </div>
    </div>
  );
}

function ClaudeMDPreview({ spec, target }) {
  const claudeMD = `# CLAUDE.md - ePayment Build Package

## Project Context
Online payment processing system. Members pay via credit card or ACH.
~300 daily transactions. Business-critical.

## Architecture
- Pattern: MVP for multi-state payment flows, MV for read-only billing
- Data: IBillingRepository → ESB → wsBilling → Facets (Sybase)
- Auth: CA SiteMinder (role + privilege)
- Real-time billing data ONLY (no cached Data Mart)

## Key Contracts
\`\`\`
IBillingRepository:
  GetBillingInfo(subscriberID) → BillingRecord
  ProcessCreditCardPayment(CreditCardPayment) → PaymentResult
  ProcessAchPayment(AchPayment) → PaymentResult
\`\`\`

## State Machine
OnlinePaymentState: EntryFields → Verification → Confirmation
                                → Cancelation
                                → Errors

## Critical Rules
- CC masked to last 4 digits on review/confirm/print
- Duplicate payment detection for BOTH CC and ACH
- Balance = real-time Facets query (NOT Data Mart)
- Disclaimer date = US CST system date

## OPEN QUESTIONS
- [ ] Where does address standardization occur?

## Test Expectations
${spec.sections.test.groups.map(g => `### ${g.label}\n${g.cases.map(c => `- [ ] ${c}`).join('\n')}`).join('\n\n')}`;

  return (
    <div>
      <ExportHeader target={target} subtitle="CLAUDE.md project context + sub-agent task delegation" />
      <div style={{ padding: 24 }}>
        <div style={{ background: `${C.accent}08`, border: `1px solid ${C.accentDim}`, borderRadius: 8, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>How This Works</div>
          <p style={{ margin: 0, fontSize: 12, color: C.text, lineHeight: 1.5 }}>
            CLAUDE.md gives Claude Code persistent project context. Every session reads it first.
            Sub-agents get delegated tasks with fresh 200k contexts but inherit the architectural decisions.
            The shovel-ready spec ensures every sub-agent has the exact DTOs, validation rules, and state machine it needs — no mid-session discovery.
          </p>
        </div>
        <CodeBlock title="CLAUDE.md" content={claudeMD} />
      </div>
    </div>
  );
}

function GenericPreview({ spec, target }) {
  const markdown = `# Spec: ePayment - Online Payment Processing
Version ${spec.version}

## 1. Requirements
${spec.sections.requirements.items.filter(i => i.type === "goal").map(i => `**Goal:** ${i.content}`).join('\n')}

### Interaction Flow
${spec.sections.requirements.items.filter(i => i.type === "flow").map(f => `**${f.label}:**\n${f.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`).join('\n\n')}

### Business Rules
${spec.sections.requirements.items.filter(i => i.type === "rules").flatMap(r => r.items).map(r => `- ${r}`).join('\n')}

## 2. Frontend Components
${spec.sections.frontend.components.map(c => `### ${c.label} (${c.pattern || 'n/a'})
Attributes: ${c.attrs.join(', ')}
${c.events ? `Events: ${c.events.join(', ')}` : ''}
${c.methods ? `Methods: ${c.methods.join(', ')}` : ''}`).join('\n\n')}

## 3. Backend Contracts
### Interfaces
${spec.sections.backend.interfaces.map(i => `**${i.label}:**\n${i.methods.map(m => `- ${m}`).join('\n')}`).join('\n')}

### DTOs
${spec.sections.backend.dtos.map(d => `**${d.label}:** ${d.fields.join(', ')}`).join('\n')}

## 4. Integration
Data Flow: ${spec.sections.integration.dataFlow}
${spec.sections.integration.endpoints.map(e => `- **${e.label}:** ${e.desc}`).join('\n')}

⚠️ Open: ${spec.sections.integration.openQuestions.join(', ')}

## 5. Test Cases (${spec.sections.test.groups.reduce((s, g) => s + g.cases.length, 0)} total)
${spec.sections.test.groups.map(g => `### ${g.label}\n${g.cases.map(c => `- [ ] ${c}`).join('\n')}`).join('\n\n')}`;

  return (
    <div>
      <ExportHeader target={target} subtitle="Universal markdown spec compatible with any AI coding tool" />
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {["Cursor", "Windsurf", "Cline", "Aider", "Continue", "Copilot", "Gemini CLI", "OpenCode"].map(tool => (
            <span key={tool} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: C.surface, border: `1px solid ${C.border}`, color: C.textMuted }}>{tool}</span>
          ))}
        </div>
        <CodeBlock title="spec/epayment-spec.md" content={markdown} />
      </div>
    </div>
  );
}

// ─── Main App ───
export default function ForgeApp() {
  const [view, setView] = useState("canvas");
  const [selectedId, setSelectedId] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [offset, setOffset] = useState({ x: 280, y: 100 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  const selectedNode = NODES.find(n => n.id === selectedId);

  const onMouseDown = (e) => { if (e.target === canvasRef.current) { setDragging(true); setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y }); }};
  const onMouseMove = (e) => { if (dragging) setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const onMouseUp = () => setDragging(false);

  const navItems = [
    { key: "canvas", label: "Graph", icon: "◇" },
    { key: "export", label: "Agentic Export", icon: "⚡" },
    { key: "sprints", label: "Sprints", icon: "▷" },
    { key: "releases", label: "Releases", icon: "◈" },
  ];

  return (
    <div style={{ width: "100%", height: "100vh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'Inter', -apple-system, sans-serif", color: C.text, overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: 5, background: `linear-gradient(135deg, ${C.accent}, #fb923c)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>F</div>
          <span style={{ fontSize: 13, fontWeight: 700 }}>FORGE</span>
          <span style={{ fontSize: 8, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Execution Architecture</span>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => { setView(item.key); setShowExport(false); }}
              style={{
                background: view === item.key ? C.hover : "transparent", border: `1px solid ${view === item.key ? C.borderActive : "transparent"}`,
                borderRadius: 5, padding: "4px 11px", cursor: "pointer", color: view === item.key ? C.text : C.textMuted,
                fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, transition: "all 0.12s",
              }}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {view === "export" ? (
          <AgenticExportView spec={SAMPLE_SPEC} onBack={() => setView("canvas")} />
        ) : view === "canvas" ? (
          <>
            <div ref={canvasRef} style={{ flex: 1, position: "relative", overflow: "hidden", cursor: dragging ? "grabbing" : "grab" }}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.12,
                backgroundImage: `radial-gradient(circle, ${C.textDim} 1px, transparent 1px)`,
                backgroundSize: "24px 24px", backgroundPosition: `${offset.x % 24}px ${offset.y % 24}px` }} />
              <GraphCanvas selectedId={selectedId} onSelect={setSelectedId} offset={offset} />
              <div style={{ position: "absolute", bottom: 14, left: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 9, color: C.textMuted }}>
                <span style={{ color: C.textDim }}>┈┈</span> contains · <span style={{ color: C.red }}>╌╌</span> requires · <span style={{ color: C.blue }}>──</span> feeds-into
              </div>
            </div>
            {selectedNode && (
              <div style={{ width: 280, borderLeft: `1px solid ${C.border}`, background: C.surface, overflowY: "auto", padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: NTYPES[selectedNode.type].color }}>{NTYPES[selectedNode.type].icon}</span>
                      <span style={{ fontSize: 8, color: NTYPES[selectedNode.type].color, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{NTYPES[selectedNode.type].label}</span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>{selectedNode.label}</h3>
                  </div>
                  <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 16, cursor: "pointer" }}>×</button>
                </div>
                <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap" }}>
                  <Badge color={CONF[selectedNode.confidence].color} bg={CONF[selectedNode.confidence].bg}>{CONF[selectedNode.confidence].label}</Badge>
                  {selectedNode.sprint && <Badge color={C.blue} bg={C.blueDim}>{selectedNode.sprint}</Badge>}
                </div>
                <div style={{ background: C.bg, borderRadius: 6, padding: 12, marginBottom: 14, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Readiness</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: rColor(avg(selectedNode.readiness)), fontFamily: "monospace" }}>{Math.round(avg(selectedNode.readiness) * 100)}%</span>
                  </div>
                  {DIMS.map(d => (
                    <div key={d} style={{ marginBottom: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
                        <span style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase" }}>{d}</span>
                        <span style={{ fontSize: 9, color: rColor(selectedNode.readiness[d]), fontWeight: 600, fontFamily: "monospace" }}>{Math.round(selectedNode.readiness[d] * 100)}%</span>
                      </div>
                      <div style={{ height: 2.5, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${selectedNode.readiness[d] * 100}%`, background: rColor(selectedNode.readiness[d]), borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
                {selectedNode.hasSpec ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button onClick={() => setView("export")} style={{
                      width: "100%", padding: "9px 14px", borderRadius: 6, border: `1px solid ${C.accent}40`,
                      background: C.accentDim, cursor: "pointer", color: C.accent, fontSize: 11, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      ⚡ Export to AI Coding Agent
                    </button>
                    <div style={{ fontSize: 9, color: C.textMuted, textAlign: "center" }}>GSD · BMAD · Spec Kit · Claude Code · Generic</div>
                  </div>
                ) : (
                  <div style={{ padding: 10, background: C.redDim, border: `1px solid ${C.red}30`, borderRadius: 6, textAlign: "center" }}>
                    <span style={{ fontSize: 10, color: C.red, fontWeight: 600 }}>⚠ No spec — cannot export</span>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>{view === "sprints" ? "Sprint Execution" : "Release Probability"}</h2>
            <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 20 }}>{view === "sprints" ? "Sprints pull from the ready queue. Overhead is budgeted explicitly." : "Probability bands, not promises."}</p>
            {view === "sprints" ? (
              Object.entries(NODES.reduce((m, n) => { if (n.sprint) { if (!m[n.sprint]) m[n.sprint] = []; m[n.sprint].push(n); } return m; }, {})).map(([name, nodes]) => (
                <div key={name} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>{name}</h3>
                    <span style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace" }}>{nodes.length * 150 + 300}h</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Badge color={C.green} bg={C.greenDim}>{nodes.filter(n => avg(n.readiness) >= 0.7).length} Ready</Badge>
                    <Badge color={C.yellow} bg={C.yellowDim}>{nodes.filter(n => { const o = avg(n.readiness); return o >= 0.4 && o < 0.7; }).length} Bubble</Badge>
                    <Badge color={C.accent} bg={C.accentDim}>{nodes.filter(n => n.hasSpec).length} Spec'd</Badge>
                  </div>
                </div>
              ))
            ) : (
              Object.entries(NODES.reduce((m, n) => { const r = n.release || "?"; if (!m[r]) m[r] = []; m[r].push(n); return m; }, {})).sort(([a],[b]) => a.localeCompare(b)).map(([name, nodes]) => {
                const committed = nodes.filter(n => n.confidence === "COMMITTED");
                const prob = Math.min(99, Math.round(committed.length / nodes.length * committed.reduce((s, n) => s + avg(n.readiness), 0) / Math.max(1, committed.length) * 100));
                return (
                  <div key={name} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.purple }}>Release {name}</h3>
                      <span style={{ fontSize: 18, fontWeight: 800, color: prob > 70 ? C.green : prob > 40 ? C.yellow : C.red, fontFamily: "monospace" }}>{prob}%</span>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div><div style={{ fontSize: 9, color: C.green, fontWeight: 600 }}>Committed</div><div style={{ fontSize: 14, fontWeight: 700 }}>{committed.length}</div></div>
                      <div><div style={{ fontSize: 9, color: C.yellow, fontWeight: 600 }}>Bubble</div><div style={{ fontSize: 14, fontWeight: 700 }}>{nodes.filter(n => n.confidence === "BUBBLE").length}</div></div>
                      <div><div style={{ fontSize: 9, color: C.textMuted, fontWeight: 600 }}>Deferred</div><div style={{ fontSize: 14, fontWeight: 700 }}>{nodes.filter(n => n.confidence === "DEFERRED").length}</div></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
