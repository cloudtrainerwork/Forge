'use client';

import React from 'react';
import { useNavigationStore } from '@/stores/navigationStore';

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

export default function BreadcrumbNav() {
  const { breadcrumbs, navigateToBreadcrumb } = useNavigationStore();

  return (
    <div
      className="flex items-center gap-2 px-4 py-2"
      style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        fontSize: '13px'
      }}
    >
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span style={{ color: C.textDim }}>/</span>
          )}
          <button
            onClick={() => navigateToBreadcrumb(index)}
            className="hover:underline transition-colors"
            style={{
              color: index === breadcrumbs.length - 1 ? C.accent : C.textMuted,
              fontWeight: index === breadcrumbs.length - 1 ? 600 : 400
            }}
          >
            {crumb.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}