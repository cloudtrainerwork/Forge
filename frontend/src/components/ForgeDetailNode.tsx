'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';

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
  purple: "#a855f7",
  purpleDim: "#a855f720",
  cyan: "#06b6d4",
  cyanDim: "#06b6d420",
};

const categoryConfig = {
  screen: {
    bg: C.blue,
    bgDim: C.blueDim,
    icon: '◻',
  },
  'ui-group': {
    bg: C.cyan,
    bgDim: C.cyanDim,
    icon: '◈',
  },
  ui: {
    bg: C.cyan,
    bgDim: C.cyanDim,
    icon: '○',
  },
  'navigation-group': {
    bg: C.purple,
    bgDim: C.purpleDim,
    icon: '➤',
  },
  navigation: {
    bg: C.purple,
    bgDim: C.purpleDim,
    icon: '→',
  },
  'service-group': {
    bg: C.yellow,
    bgDim: C.yellowDim,
    icon: '⬡',
  },
  service: {
    bg: C.yellow,
    bgDim: C.yellowDim,
    icon: '◇',
  },
  'dto-group': {
    bg: C.red,
    bgDim: C.redDim,
    icon: '▣',
  },
  dto: {
    bg: C.red,
    bgDim: C.redDim,
    icon: '◻',
  },
  integration: {
    bg: C.green,
    bgDim: C.greenDim,
    icon: '⬢',
  },
  model: {
    bg: C.accent,
    bgDim: C.accentDim,
    icon: '◆',
  },
};

interface ForgeDetailNodeData {
  label: string;
  category: keyof typeof categoryConfig;
  isMain?: boolean;
  items?: string[];
}

export default function ForgeDetailNode({ data }: { data: ForgeDetailNodeData }) {
  const config = categoryConfig[data.category] || categoryConfig.screen;
  const isGroup = data.category.includes('group');

  const nodeStyle = {
    padding: data.isMain ? '16px 24px' : isGroup ? '12px 16px' : '8px 12px',
    background: data.isMain ? C.surface : isGroup ? C.surfaceAlt : C.surface,
    border: `1.5px solid ${config.bg}`,
    borderRadius: data.isMain ? 12 : isGroup ? 8 : 6,
    fontSize: data.isMain ? 14 : isGroup ? 13 : 11,
    minWidth: data.isMain ? 200 : isGroup ? 150 : 120,
    position: 'relative' as const,
  };

  const labelStyle = {
    color: data.isMain ? C.text : C.textMuted,
    fontWeight: data.isMain ? 700 : isGroup ? 600 : 400,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const iconStyle = {
    color: config.bg,
    fontSize: data.isMain ? 18 : 14,
  };

  const statusDot = !data.isMain && !isGroup && (
    <div
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: C.green,
        position: 'absolute',
        top: 6,
        right: 6,
      }}
    />
  );

  return (
    <div style={nodeStyle}>
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: config.bg,
          border: `2px solid ${C.surface}`,
          width: 8,
          height: 8,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: config.bg,
          border: `2px solid ${C.surface}`,
          width: 8,
          height: 8,
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: config.bg,
          border: `2px solid ${C.surface}`,
          width: 8,
          height: 8,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: config.bg,
          border: `2px solid ${C.surface}`,
          width: 8,
          height: 8,
        }}
      />

      {statusDot}

      <div style={labelStyle}>
        <span style={iconStyle}>{config.icon}</span>
        <span>{data.label}</span>
      </div>

      {data.items && data.items.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
          {data.items.map((item, i) => (
            <div
              key={i}
              style={{
                fontSize: 10,
                color: C.textDim,
                padding: '2px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{ color: config.bg }}>•</span>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}