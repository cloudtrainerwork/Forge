'use client';

import React, { useState, useMemo } from 'react';
import { useSpecification } from '../../hooks/useSpecification';
import { SpecificationStatusIndicator, BatchSpecificationStatusIndicator } from './SpecificationStatusIndicator';

const C = {
  bg: "#08090d",
  surface: "#111219",
  surfaceAlt: "#161822",
  hover: "#1c1e2d",
  border: "#1f2235",
  borderActive: "#3b4068",
  text: "#e4e6f2",
  textMuted: "#6d7196",
  textDim: "#3a3e5c",
  accent: "#f97316",
  accentDim: "#f9731620",
  green: "#22c55e",
  greenDim: "#22c55e20",
  yellow: "#eab308",
  yellowDim: "#eab30820",
  red: "#ef4444",
  redDim: "#ef444420",
  blue: "#3b82f6",
  blueDim: "#3b82f620",
};

export interface SpecificationEditorProps {
  workItemId: string;
  onClose?: () => void;
  className?: string;
  variant?: 'full' | 'compact' | 'modal';
}

const SECTION_CONFIG = {
  requirements: { title: 'Requirements', description: 'Functional requirements and acceptance criteria', icon: '📋' },
  design: { title: 'Design', description: 'Architecture and technical specifications', icon: '📐' },
  frontend: { title: 'Frontend', description: 'User interface and user experience', icon: '🎨' },
  backend: { title: 'Backend', description: 'Server architecture and services', icon: '⚙️' },
  integration: { title: 'Integration', description: 'System integrations and APIs', icon: '🔗' },
  test: { title: 'Test', description: 'Testing strategy and validation', icon: '✅' },
} as const;

type SectionName = keyof typeof SECTION_CONFIG;

const PLACEHOLDERS: Record<SectionName, string> = {
  requirements: "Define functional requirements, user stories, acceptance criteria, and business rules...",
  design: "Describe architecture, data models, API design, and technical specifications...",
  frontend: "Detail UI/UX components, user flows, responsive design, and frontend implementation...",
  backend: "Outline server architecture, database design, APIs, and backend services...",
  integration: "Define system integrations, external APIs, data flows, and communication protocols...",
  test: "Specify test cases, testing strategy, quality assurance criteria, and validation methods...",
};

function borderForStatus(status: string): string {
  switch (status) {
    case 'draft': return C.yellow;
    case 'review': return C.accent;
    case 'complete': return C.green;
    default: return C.border;
  }
}

export function SpecificationEditor({ workItemId, onClose, className = '', variant = 'full' }: SpecificationEditorProps) {
  const [activeSection, setActiveSection] = useState<SectionName>('requirements');
  const { spec, isDirty, lastSaved, updateSectionContent, save, getSectionStatus } = useSpecification(workItemId);

  const overallProgress = useMemo(() => {
    return Object.entries(SECTION_CONFIG).map(([key, config]) => ({
      name: config.title,
      status: getSectionStatus(key as SectionName),
    }));
  }, [spec, getSectionStatus]);

  const handleSave = () => {
    save();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+S / Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const sectionData = spec.sections[activeSection];
  const sectionBorder = borderForStatus(sectionData.status);

  return (
    <div
      className={`rounded-lg shadow-lg border min-h-[600px] ${className}`}
      style={{ backgroundColor: C.surface, borderColor: C.border }}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold" style={{ color: C.text }}>Specification Editor</h2>
          <BatchSpecificationStatusIndicator sections={overallProgress} size="lg" />
          <div className="text-sm" style={{ color: C.textMuted }}>{spec.completionPercentage}% Complete</div>
        </div>

        <div className="flex items-center gap-3">
          {/* Save status */}
          {lastSaved && !isDirty && (
            <div className="flex items-center gap-2 text-sm" style={{ color: C.green }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C.green }} />
              Saved {lastSaved.toLocaleTimeString()}
            </div>
          )}
          {isDirty && (
            <div className="flex items-center gap-2 text-sm" style={{ color: C.yellow }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C.yellow }} />
              Unsaved changes
            </div>
          )}

          {/* SAVE BUTTON */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty}
            className="px-4 py-2 rounded font-medium text-sm transition-all"
            style={{
              backgroundColor: isDirty ? C.accent : C.hover,
              color: isDirty ? '#fff' : C.textMuted,
              opacity: isDirty ? 1 : 0.5,
              cursor: isDirty ? 'pointer' : 'default',
            }}
          >
            💾 Save
          </button>

          {/* Close */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded hover:bg-opacity-80 transition-colors"
              style={{ backgroundColor: C.hover, color: C.textMuted }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex" style={{ minHeight: 500 }}>
        {/* Section Nav Sidebar */}
        <div className="w-64 border-r" style={{ borderColor: C.border, backgroundColor: C.surfaceAlt }}>
          <div className="p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color: C.textMuted }}>SECTIONS</h3>
            <div className="space-y-2">
              {Object.entries(SECTION_CONFIG).map(([key, config]) => {
                const k = key as SectionName;
                const status = getSectionStatus(k);
                const isActive = activeSection === k;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setActiveSection(k)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${isActive ? 'shadow-sm' : ''}`}
                    style={{
                      backgroundColor: isActive ? C.hover : 'transparent',
                      borderLeft: isActive ? `3px solid ${C.accent}` : '3px solid transparent',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm" style={{ color: C.text }}>{config.title}</span>
                          <SpecificationStatusIndicator status={status} size="sm" />
                        </div>
                        <p className="text-xs mt-1 leading-tight" style={{ color: C.textMuted }}>{config.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Section header */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-3">
                <span className="text-2xl">{SECTION_CONFIG[activeSection].icon}</span>
                <h3 className="text-xl font-semibold" style={{ color: C.text }}>{SECTION_CONFIG[activeSection].title}</h3>
                <SpecificationStatusIndicator status={sectionData.status} size="lg" showText />
                <span className="text-xs" style={{ color: C.textMuted }}>{sectionData.wordCount} words</span>
              </div>
              <p className="text-sm" style={{ color: C.textMuted }}>{SECTION_CONFIG[activeSection].description}</p>
            </div>

            {/* Textarea */}
            <textarea
              value={sectionData.content}
              placeholder={PLACEHOLDERS[activeSection]}
              className="w-full min-h-[300px] p-4 rounded-lg resize-vertical focus:outline-none font-mono"
              style={{
                backgroundColor: C.bg,
                border: `1.5px solid ${sectionBorder}`,
                color: C.text,
                fontSize: '14px',
                lineHeight: '1.6',
              }}
              onFocus={(e) => { e.target.style.borderColor = C.borderActive; }}
              onBlur={(e) => { e.target.style.borderColor = sectionBorder; }}
              onKeyDown={(e) => { e.stopPropagation(); }}
              onChange={(e) => {
                updateSectionContent(activeSection, e.target.value);
              }}
            />

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t" style={{ borderColor: C.border }}>
              <button
                type="button"
                onClick={() => {
                  const sections = Object.keys(SECTION_CONFIG) as SectionName[];
                  const idx = sections.indexOf(activeSection);
                  setActiveSection(sections[idx > 0 ? idx - 1 : sections.length - 1]);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded transition-colors"
                style={{ backgroundColor: C.hover, color: C.text }}
              >
                ← Previous
              </button>

              <div className="flex items-center gap-2">
                {Object.keys(SECTION_CONFIG).map((key) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setActiveSection(key as SectionName)}
                    className="w-2 h-2 rounded-full transition-colors"
                    style={{
                      backgroundColor: activeSection === key ? C.accent : C.textMuted,
                      opacity: activeSection === key ? 1 : 0.4,
                    }}
                    title={SECTION_CONFIG[key as SectionName].title}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const sections = Object.keys(SECTION_CONFIG) as SectionName[];
                  const idx = sections.indexOf(activeSection);
                  setActiveSection(sections[(idx + 1) % sections.length]);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded transition-colors"
                style={{ backgroundColor: C.hover, color: C.text }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpecificationEditor;
