'use client';

import React from 'react';
import { TEMPLATE_CATEGORIES } from '../data/workflowTemplates';

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
  red: "#ef4444",
};

interface Project {
  id: string;
  name: string;
  templateId?: string;
  nodes?: any[];
  edges?: any[];
}

interface ProjectNavigatorProps {
  projects: Project[];
  currentProject: Project | null;
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
  onDeleteProject: (projectId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectNavigator({
  projects,
  currentProject,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  isOpen,
  onClose,
}: ProjectNavigatorProps) {
  if (!isOpen) return null;

  const getTemplateIcon = (templateId?: string) => {
    if (!templateId) return '📄';
    const categoryKey = templateId.split('-')[0];
    const category = TEMPLATE_CATEGORIES[categoryKey];
    return category?.icon || '📄';
  };

  const getNodeStats = (nodes: any[]) => {
    if (!nodes || nodes.length === 0) return { total: 0, avgReadiness: 0 };
    const total = nodes.length;
    const avgReadiness = nodes.reduce((sum, node) => {
      if (!node.data?.readiness) return sum;
      const values = Object.values(node.data.readiness) as number[];
      const nodeAvg = values.reduce((a, b) => a + b, 0) / values.length;
      return sum + nodeAvg;
    }, 0) / total;
    return { total, avgReadiness: Math.round(avgReadiness * 100) };
  };

  return (
    <div
      className="fixed left-0 top-0 h-full w-80 z-40 flex flex-col shadow-2xl"
      style={{
        background: C.surface,
        borderRight: `1px solid ${C.border}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{ borderColor: C.border }}
      >
        <h2 className="text-lg font-bold" style={{ color: C.text }}>
          Projects
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:scale-110 transition-transform"
          style={{
            background: C.surfaceAlt,
            border: `1px solid ${C.border}`,
            color: C.text,
          }}
        >
          ✕
        </button>
      </div>

      {/* New Project Button */}
      <div className="p-4 border-b" style={{ borderColor: C.border }}>
        <button
          onClick={onNewProject}
          className="w-full px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-all hover:scale-[1.02]"
          style={{
            background: C.accent,
            color: 'white',
          }}
        >
          <span className="text-lg">+</span>
          New Project
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto p-4">
        {projects.length === 0 ? (
          <div className="text-center py-8">
            <p style={{ color: C.textMuted }}>No projects yet</p>
            <p className="text-sm mt-2" style={{ color: C.textDim }}>
              Click "New Project" to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => {
              const stats = getNodeStats(project.nodes || []);
              const isActive = currentProject?.id === project.id;

              return (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className="p-4 rounded-lg cursor-pointer transition-all hover:scale-[1.01]"
                  style={{
                    background: isActive ? C.hover : C.surfaceAlt,
                    border: `1px solid ${isActive ? C.accent : C.border}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = C.borderActive;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = C.border;
                    }
                  }}
                >
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTemplateIcon(project.templateId)}</span>
                      <div>
                        <h3 className="font-semibold" style={{ color: C.text }}>
                          {project.name}
                        </h3>
                        {isActive && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full inline-block mt-1"
                            style={{
                              background: `${C.accent}20`,
                              color: C.accent,
                              border: `1px solid ${C.accent}`,
                            }}
                          >
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete project "${project.name}"?`)) {
                          onDeleteProject(project.id);
                        }
                      }}
                      className="p-1 rounded opacity-0 hover:opacity-100 transition-opacity"
                      style={{
                        background: C.red,
                        color: 'white',
                      }}
                    >
                      <span className="text-xs">✕</span>
                    </button>
                  </div>

                  {/* Project Stats */}
                  {stats.total > 0 && (
                    <div className="flex items-center gap-4 text-xs">
                      <div style={{ color: C.textMuted }}>
                        {stats.total} components
                      </div>
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: stats.avgReadiness >= 60 ? C.green : stats.avgReadiness >= 30 ? '#f59e0b' : C.red,
                          }}
                        />
                        <span style={{ color: C.textMuted }}>
                          {stats.avgReadiness}% ready
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="p-4 border-t text-xs text-center"
        style={{
          borderColor: C.border,
          color: C.textDim,
        }}
      >
        {projects.length} project{projects.length !== 1 ? 's' : ''} • Click to switch
      </div>
    </div>
  );
}