'use client';

import React from 'react';

const C = {
  bg: "#08090d",
  surface: "#111219",
  surfaceAlt: "#161822",
  hover: "#1c1e2d",
  border: "#1f2235",
  text: "#e4e6f2",
  textMuted: "#6d7196",
  accent: "#f97316",
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#a855f7",
  cyan: "#06b6d4",
};

export const NODE_TEMPLATES = {
  // UI Elements
  'button': {
    type: 'ui',
    label: 'Button',
    icon: '🔲',
    states: ['Default', 'Hover', 'Active', 'Disabled'],
    defaultState: 'Default',
    color: C.cyan,
  },
  'input': {
    type: 'ui',
    label: 'Input Field',
    icon: '📝',
    states: ['Empty', 'Focused', 'Filled', 'Error'],
    defaultState: 'Empty',
    color: C.cyan,
  },
  'dropdown': {
    type: 'ui',
    label: 'Dropdown',
    icon: '▼',
    states: ['Closed', 'Open', 'Selected'],
    defaultState: 'Closed',
    color: C.cyan,
  },
  'checkbox': {
    type: 'ui',
    label: 'Checkbox',
    icon: '☑',
    states: ['Unchecked', 'Checked', 'Indeterminate'],
    defaultState: 'Unchecked',
    color: C.cyan,
  },

  // Navigation
  'link': {
    type: 'navigation',
    label: 'Navigation Link',
    icon: '🔗',
    states: ['Default', 'Visited', 'Active'],
    defaultState: 'Default',
    color: C.purple,
  },
  'tab': {
    type: 'navigation',
    label: 'Tab',
    icon: '📑',
    states: ['Inactive', 'Active', 'Disabled'],
    defaultState: 'Inactive',
    color: C.purple,
  },

  // Services
  'api-call': {
    type: 'service',
    label: 'API Call',
    icon: '🌐',
    states: ['Ready', 'Loading', 'Success', 'Error'],
    defaultState: 'Ready',
    color: C.yellow,
  },
  'validation': {
    type: 'service',
    label: 'Validation',
    icon: '✓',
    states: ['Pending', 'Valid', 'Invalid'],
    defaultState: 'Pending',
    color: C.yellow,
  },
  'auth': {
    type: 'service',
    label: 'Authentication',
    icon: '🔒',
    states: ['Unauthenticated', 'Authenticated', 'Expired'],
    defaultState: 'Unauthenticated',
    color: C.yellow,
  },

  // Data
  'dto': {
    type: 'dto',
    label: 'Data Object',
    icon: '📦',
    states: ['Empty', 'Partial', 'Complete'],
    defaultState: 'Empty',
    color: C.red,
  },
  'field': {
    type: 'dto',
    label: 'Field',
    icon: '🏷',
    states: ['Optional', 'Required', 'Validated'],
    defaultState: 'Optional',
    color: C.red,
  },

  // Integration
  'webhook': {
    type: 'integration',
    label: 'Webhook',
    icon: '🪝',
    states: ['Inactive', 'Active', 'Failed'],
    defaultState: 'Inactive',
    color: C.green,
  },
  'database': {
    type: 'integration',
    label: 'Database',
    icon: '🗄',
    states: ['Disconnected', 'Connected', 'Syncing'],
    defaultState: 'Disconnected',
    color: C.green,
  },

  // Models
  'view-model': {
    type: 'model',
    label: 'View Model',
    icon: '📊',
    states: ['Uninitialized', 'Loaded', 'Modified', 'Saved'],
    defaultState: 'Uninitialized',
    color: C.accent,
  },
  'state-machine': {
    type: 'model',
    label: 'State Machine',
    icon: '⚙',
    states: ['Initial', 'Running', 'Paused', 'Complete'],
    defaultState: 'Initial',
    color: C.accent,
  },
};

interface NodePaletteProps {
  onAddNode: (template: keyof typeof NODE_TEMPLATES) => void;
}

export default function NodePalette({ onAddNode }: NodePaletteProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  const categories = Array.from(new Set(Object.values(NODE_TEMPLATES).map(t => t.type)));

  const filteredTemplates = selectedCategory
    ? Object.entries(NODE_TEMPLATES).filter(([_, t]) => t.type === selectedCategory)
    : Object.entries(NODE_TEMPLATES);

  return (
    <div
      className="absolute left-4 top-20 w-64 max-h-[600px] overflow-y-auto rounded-lg"
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
      }}
    >
      <div className="p-3 border-b" style={{ borderColor: C.border }}>
        <h3 className="text-sm font-bold mb-2" style={{ color: C.text }}>
          Node Library
        </h3>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              !selectedCategory ? 'font-medium' : ''
            }`}
            style={{
              background: !selectedCategory ? C.accent : 'transparent',
              color: !selectedCategory ? 'white' : C.textMuted,
              border: `1px solid ${!selectedCategory ? C.accent : C.border}`,
            }}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-1 rounded text-xs transition-colors capitalize ${
                selectedCategory === cat ? 'font-medium' : ''
              }`}
              style={{
                background: selectedCategory === cat ? C.accent : 'transparent',
                color: selectedCategory === cat ? 'white' : C.textMuted,
                border: `1px solid ${selectedCategory === cat ? C.accent : C.border}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-2">
        {filteredTemplates.map(([key, template]) => (
          <div
            key={key}
            onClick={() => onAddNode(key as keyof typeof NODE_TEMPLATES)}
            className="p-2 mb-1 rounded cursor-pointer transition-all hover:scale-[1.02]"
            style={{
              background: C.surfaceAlt,
              border: `1px solid ${C.border}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = template.color;
              e.currentTarget.style.background = C.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.background = C.surfaceAlt;
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: template.color, fontSize: '16px' }}>
                {template.icon}
              </span>
              <span className="text-xs font-medium" style={{ color: C.text }}>
                {template.label}
              </span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {template.states.map((state, i) => (
                <span
                  key={state}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background: i === 0 ? `${template.color}20` : C.bg,
                    color: i === 0 ? template.color : C.textMuted,
                    border: `1px solid ${i === 0 ? template.color : C.border}`,
                  }}
                >
                  {state}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}