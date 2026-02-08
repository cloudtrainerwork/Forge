import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import AgenticExport from "./forge-agentic-export.jsx";
import Reconciliation from "./forge-reconciliation.jsx";
import IntegrationArch from "./forge-integration-architecture.jsx";

const TABS = [
  { id: "export", label: "Agentic Export", desc: "Graph + Shovel-Ready Specs + GSD/BMAD/SpecKit Export", Component: AgenticExport },
  { id: "reconcile", label: "Live Reconciliation", desc: "Watch agents complete tasks and update the graph in real-time", Component: Reconciliation },
  { id: "architecture", label: "Integration Architecture", desc: "GitHub Action + VS Code Extension + Webhook API", Component: IntegrationArch },
];

function App() {
  const [activeTab, setActiveTab] = useState("export");
  const active = TABS.find(t => t.id === activeTab);

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "#08090d", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Top tab bar */}
      <div style={{
        height: 42, display: "flex", alignItems: "center", gap: 0,
        background: "#0d0e14", borderBottom: "1px solid #1f2235",
        padding: "0 12px", flexShrink: 0,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5, marginRight: 10,
          background: "linear-gradient(135deg, #f97316, #fb923c)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, color: "#fff",
        }}>F</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#e4e6f2", marginRight: 6 }}>FORGE</span>
        <span style={{ fontSize: 8, color: "#6d7196", letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 20 }}>Platform</span>

        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "6px 14px", marginRight: 2,
                background: isActive ? "#111219" : "transparent",
                border: "1px solid " + (isActive ? "#1f2235" : "transparent"),
                borderBottom: isActive ? "1px solid #111219" : "1px solid #1f2235",
                borderRadius: "6px 6px 0 0",
                color: isActive ? "#e4e6f2" : "#6d7196",
                fontSize: 11, fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s",
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: "#3a3e5c" }}>{active?.desc}</span>
      </div>

      {/* Active tab content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {active && <active.Component />}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
