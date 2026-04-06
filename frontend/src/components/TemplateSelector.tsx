'use client';

import React, { useState } from 'react';
import { WORKFLOW_TEMPLATES, TEMPLATE_CATEGORIES, flattenTemplate } from '../data/workflowTemplates';

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
};

interface TemplateSelectorProps {
  onSelectTemplate: (templateId: string, customName?: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function TemplateSelector({ onSelectTemplate, onClose, isOpen }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');

  if (!isOpen) return null;

  const filteredTemplates = selectedCategory
    ? WORKFLOW_TEMPLATES.filter(t => t.category === selectedCategory)
    : WORKFLOW_TEMPLATES;

  const handleTemplateClick = (templateId: string) => {
    const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      setProjectName(template.name);
      setShowNameDialog(true);
    }
  };

  const handleConfirmProject = () => {
    if (selectedTemplateId && projectName.trim()) {
      onSelectTemplate(selectedTemplateId, projectName.trim());
      setShowNameDialog(false);
      setSelectedTemplateId(null);
      setProjectName('');
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return '#22c55e';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return C.textMuted;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(8, 9, 13, 0.8)' }}
    >
      <div
        className="w-full max-w-6xl max-h-[90vh] rounded-xl overflow-hidden"
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: C.border }}
        >
          <div>
            <h2 className="text-2xl font-bold" style={{ color: C.text }}>
              Choose a Template
            </h2>
            <p className="text-sm mt-1" style={{ color: C.textMuted }}>
              Start with a pre-built workflow pattern for common application types
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:scale-110 transition-transform"
            style={{
              background: C.surfaceAlt,
              border: `1px solid ${C.border}`,
              color: C.text,
            }}
          >
            ✕
          </button>
        </div>

        {/* Category filters */}
        <div className="p-6 border-b" style={{ borderColor: C.border }}>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                !selectedCategory ? 'font-medium' : ''
              }`}
              style={{
                background: !selectedCategory ? C.accent : 'transparent',
                color: !selectedCategory ? 'white' : C.textMuted,
                border: `1px solid ${!selectedCategory ? C.accent : C.border}`,
              }}
            >
              All Templates
            </button>
            {Object.entries(TEMPLATE_CATEGORIES).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                  selectedCategory === key ? 'font-medium' : ''
                }`}
                style={{
                  background: selectedCategory === key ? category.color : 'transparent',
                  color: selectedCategory === key ? 'white' : C.textMuted,
                  border: `1px solid ${selectedCategory === key ? category.color : C.border}`,
                }}
              >
                <span>{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Templates grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const category = TEMPLATE_CATEGORIES[template.category];
              return (
                <div
                  key={template.id}
                  onClick={() => handleTemplateClick(template.id)}
                  className="p-6 rounded-lg cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
                  style={{
                    background: C.surfaceAlt,
                    border: `1px solid ${C.border}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = category.color;
                    e.currentTarget.style.background = C.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.background = C.surfaceAlt;
                  }}
                >
                  {/* Template header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{category.icon}</span>
                      <span
                        className="text-xs px-2 py-1 rounded uppercase font-medium"
                        style={{
                          background: `${category.color}20`,
                          color: category.color,
                          border: `1px solid ${category.color}`,
                        }}
                      >
                        {category.name}
                      </span>
                    </div>
                    <div
                      className="text-xs px-2 py-1 rounded font-medium"
                      style={{
                        background: `${getComplexityColor(template.estimatedComplexity)}20`,
                        color: getComplexityColor(template.estimatedComplexity),
                        border: `1px solid ${getComplexityColor(template.estimatedComplexity)}`,
                      }}
                    >
                      {template.estimatedComplexity.toUpperCase()}
                    </div>
                  </div>

                  {/* Template info */}
                  <h3 className="text-lg font-semibold mb-2" style={{ color: C.text }}>
                    {template.name}
                  </h3>
                  <p className="text-sm mb-4" style={{ color: C.textMuted }}>
                    {template.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs">
                    <div style={{ color: C.textDim }}>
                      {flattenTemplate(template).length} components • {template.edges.length} connections
                    </div>
                    <div style={{ color: C.textDim }}>
                      {template.estimatedTimeframe}
                    </div>
                  </div>

                  {/* Root node preview */}
                  <div className="mt-4 flex gap-1 flex-wrap">
                    {template.rootNodes.slice(0, 8).map((node, i) => (
                      <div
                        key={i}
                        className="px-1.5 py-0.5 rounded text-xs"
                        style={{
                          background: C.bg,
                          color: C.textMuted,
                          border: `1px solid ${C.border}`,
                          fontSize: 9,
                        }}
                        title={node.description || node.label}
                      >
                        {node.label}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <p style={{ color: C.textMuted }}>
                No templates found for the selected category.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-6 border-t flex items-center justify-between"
          style={{ borderColor: C.border }}
        >
          <div className="flex items-center gap-4 text-xs" style={{ color: C.textDim }}>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded"></div>
              <span>Ready</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded"></div>
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded"></div>
              <span>Not Started</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: 'transparent',
              border: `1px solid ${C.border}`,
              color: C.textMuted,
            }}
          >
            Start Blank Instead
          </button>
        </div>
      </div>

      {/* Project Name Dialog */}
      {showNameDialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: 'rgba(8, 9, 13, 0.9)' }}
        >
          <div
            className="w-full max-w-md rounded-xl p-6"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
            }}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: C.text }}>
              Name Your Project
            </h3>
            <p className="text-sm mb-6" style={{ color: C.textMuted }}>
              Give your new project a custom name
            </p>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmProject();
                if (e.key === 'Escape') setShowNameDialog(false);
              }}
              className="w-full px-4 py-3 rounded-lg text-sm mb-6"
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                color: C.text,
                outline: 'none',
              }}
              placeholder="Enter project name..."
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNameDialog(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm transition-colors"
                style={{
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  color: C.textMuted,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmProject}
                disabled={!projectName.trim()}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: projectName.trim() ? C.accent : C.surfaceAlt,
                  color: projectName.trim() ? 'white' : C.textDim,
                  border: `1px solid ${projectName.trim() ? C.accent : C.border}`,
                  cursor: projectName.trim() ? 'pointer' : 'not-allowed',
                  opacity: projectName.trim() ? 1 : 0.5,
                }}
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}