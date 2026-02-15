'use client';

import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { NODE_TEMPLATES } from './NodePalette';

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
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#a855f7",
  cyan: "#06b6d4",
};

export interface ForgeDetailNodeData {
  id: string;
  label: string;
  templateKey?: keyof typeof NODE_TEMPLATES;
  currentState?: string;
  customStates?: string[];
  notes?: string;
  isMain?: boolean;
  onUpdate?: (data: Partial<ForgeDetailNodeData>) => void;
  onDelete?: () => void;
}

export default function ForgeDetailNodeEditable({ data, selected }: { data: ForgeDetailNodeData; selected?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label);
  const [showStateMenu, setShowStateMenu] = useState(false);

  const template = data.templateKey ? NODE_TEMPLATES[data.templateKey] : null;
  const states = template?.states || data.customStates || ['Default'];
  const currentState = data.currentState || states[0];
  const currentStateIndex = states.indexOf(currentState);

  const handleLabelSave = () => {
    if (data.onUpdate) {
      data.onUpdate({ label: editLabel });
    }
    setIsEditing(false);
  };

  const handleStateChange = (newState: string) => {
    if (data.onUpdate) {
      data.onUpdate({ currentState: newState });
    }
    setShowStateMenu(false);
  };

  const getStateColor = (state: string, index: number) => {
    if (!template) return C.textMuted;

    // Map state index to color intensity
    if (index === 0) return template.color; // Default/Initial state
    if (index === states.length - 1 && state.toLowerCase().includes('error')) return C.red;
    if (state.toLowerCase().includes('success') || state.toLowerCase().includes('complete')) return C.green;
    if (state.toLowerCase().includes('loading') || state.toLowerCase().includes('progress')) return C.yellow;
    return C.textMuted;
  };

  const nodeStyle = {
    padding: data.isMain ? '16px 24px' : '10px 14px',
    background: selected ? C.hover : C.surface,
    border: `1.5px solid ${selected ? C.accent : template?.color || C.border}`,
    borderRadius: data.isMain ? 12 : 6,
    fontSize: data.isMain ? 14 : 12,
    minWidth: data.isMain ? 200 : 140,
    position: 'relative' as const,
    cursor: 'default',
  };

  return (
    <div style={nodeStyle}>
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: template?.color || C.accent,
          border: `2px solid ${C.surface}`,
          width: 10,
          height: 10,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: template?.color || C.accent,
          border: `2px solid ${C.surface}`,
          width: 10,
          height: 10,
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: template?.color || C.accent,
          border: `2px solid ${C.surface}`,
          width: 10,
          height: 10,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: template?.color || C.accent,
          border: `2px solid ${C.surface}`,
          width: 10,
          height: 10,
        }}
      />

      {/* Delete button */}
      {!data.isMain && data.onDelete && (
        <button
          onClick={data.onDelete}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs hover:scale-110 transition-transform"
          style={{
            background: C.red,
            color: 'white',
            border: `2px solid ${C.surface}`,
          }}
        >
          ×
        </button>
      )}

      {/* Icon and Type */}
      {template && (
        <div className="flex items-center gap-2 mb-2">
          <span style={{ color: template.color, fontSize: '16px' }}>
            {template.icon}
          </span>
          <span style={{ color: C.textMuted, fontSize: '10px', textTransform: 'uppercase' }}>
            {template.type}
          </span>
        </div>
      )}

      {/* Editable Label */}
      <div className="mb-2">
        {isEditing ? (
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleLabelSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLabelSave();
              if (e.key === 'Escape') {
                setEditLabel(data.label);
                setIsEditing(false);
              }
            }}
            className="w-full px-1 py-0.5 rounded text-sm"
            style={{
              background: C.bg,
              border: `1px solid ${C.accent}`,
              color: C.text,
              outline: 'none',
            }}
            autoFocus
          />
        ) : (
          <div
            onDoubleClick={() => setIsEditing(true)}
            className="font-medium cursor-text"
            style={{ color: C.text }}
            title="Double-click to edit"
          >
            {data.label}
          </div>
        )}
      </div>

      {/* State Selector */}
      {states.length > 1 && (
        <div className="relative">
          <div
            onClick={() => setShowStateMenu(!showStateMenu)}
            className="px-2 py-1 rounded text-xs cursor-pointer flex items-center justify-between"
            style={{
              background: `${getStateColor(currentState, currentStateIndex)}20`,
              border: `1px solid ${getStateColor(currentState, currentStateIndex)}`,
              color: getStateColor(currentState, currentStateIndex),
            }}
          >
            <span>{currentState}</span>
            <span className="ml-2">▼</span>
          </div>

          {/* State Dropdown */}
          {showStateMenu && (
            <div
              className="absolute top-full left-0 right-0 mt-1 rounded shadow-lg z-10"
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
              }}
            >
              {states.map((state, index) => (
                <div
                  key={state}
                  onClick={() => handleStateChange(state)}
                  className="px-2 py-1.5 text-xs cursor-pointer hover:bg-opacity-10"
                  style={{
                    color: getStateColor(state, index),
                    background: state === currentState ? `${getStateColor(state, index)}10` : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${getStateColor(state, index)}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = state === currentState ? `${getStateColor(state, index)}10` : 'transparent';
                  }}
                >
                  {state}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes (optional) */}
      {data.notes && (
        <div
          className="mt-2 pt-2 text-xs"
          style={{
            borderTop: `1px solid ${C.border}`,
            color: C.textDim,
          }}
        >
          {data.notes}
        </div>
      )}
    </div>
  );
}