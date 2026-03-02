'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Controller } from 'react-hook-form';
import { useSpecification } from '../../hooks/useSpecification';
import { SpecificationSection } from './SpecificationSection';
import { SpecificationStatusIndicator, BatchSpecificationStatusIndicator } from './SpecificationStatusIndicator';

// Color palette from ForgeGraph component for consistency
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

// Section configuration with metadata
const SECTION_CONFIG = {
  requirements: {
    title: 'Requirements',
    description: 'Functional requirements and acceptance criteria',
    icon: '📋',
  },
  design: {
    title: 'Design',
    description: 'Architecture and technical specifications',
    icon: '📐',
  },
  frontend: {
    title: 'Frontend',
    description: 'User interface and user experience',
    icon: '🎨',
  },
  backend: {
    title: 'Backend',
    description: 'Server architecture and services',
    icon: '⚙️',
  },
  integration: {
    title: 'Integration',
    description: 'System integrations and APIs',
    icon: '🔗',
  },
  test: {
    title: 'Test',
    description: 'Testing strategy and validation',
    icon: '✅',
  },
} as const;

export type SectionName = keyof typeof SECTION_CONFIG;

export function SpecificationEditor({
  workItemId,
  onClose,
  className = '',
  variant = 'full'
}: SpecificationEditorProps) {
  // State for UI controls
  const [activeSection, setActiveSection] = useState<SectionName>('requirements');
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllSections, setShowAllSections] = useState(false);

  // Use our specification hook
  const {
    form,
    state,
    specification,
    updateSection,
    getSectionStatus,
    getCompletionPercentage,
    getOverallStatus,
  } = useSpecification(workItemId);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            // Manual save could be implemented here, but auto-save handles it
            break;
          case 'Tab':
            e.preventDefault();
            // Switch to next section
            const sections = Object.keys(SECTION_CONFIG) as SectionName[];
            const currentIndex = sections.indexOf(activeSection);
            const nextIndex = (currentIndex + 1) % sections.length;
            setActiveSection(sections[nextIndex]);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeSection]);

  // Calculate overall progress for display
  const overallProgress = useMemo(() => {
    if (!specification) return { percentage: 0, sectionsData: [] };

    const sectionsData = Object.entries(SECTION_CONFIG).map(([key, config]) => ({
      name: config.title,
      status: getSectionStatus(key as SectionName),
    }));

    return {
      percentage: getCompletionPercentage(),
      sectionsData,
    };
  }, [specification, getSectionStatus, getCompletionPercentage]);

  // Loading state
  if (state.loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`} style={{ backgroundColor: C.surface }}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          <span style={{ color: C.textMuted }}>Loading specification...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className={`p-6 ${className}`} style={{ backgroundColor: C.surface }}>
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: C.redDim,
            borderColor: C.red,
            color: C.red,
          }}
        >
          <h3 className="font-semibold mb-2">Error Loading Specification</h3>
          <p className="text-sm">{state.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 rounded text-sm bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const containerClasses = variant === 'modal'
    ? 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'
    : variant === 'compact'
    ? 'rounded-lg shadow-lg border max-h-[600px] overflow-hidden'
    : 'rounded-lg shadow-lg border min-h-[600px]';

  const contentClasses = variant === 'modal'
    ? 'bg-gray-900 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden'
    : 'w-full h-full';

  return (
    <div className={`${containerClasses} ${className}`} style={{ backgroundColor: variant !== 'modal' ? C.surface : undefined, borderColor: C.border }}>
      <div className={contentClasses} style={{ backgroundColor: C.surface }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold" style={{ color: C.text }}>
              Specification Editor
            </h2>

            {/* Overall Progress */}
            <BatchSpecificationStatusIndicator
              sections={overallProgress.sectionsData}
              size="lg"
            />

            <div className="text-sm" style={{ color: C.textMuted }}>
              {overallProgress.percentage}% Complete
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Save Status */}
            {state.saving && (
              <div className="flex items-center gap-2 text-sm" style={{ color: C.yellow }}>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent"></div>
                Saving...
              </div>
            )}

            {state.lastSaved && !state.saving && (
              <div className="flex items-center gap-2 text-sm" style={{ color: C.green }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C.green }}></div>
                Saved {state.lastSaved.toLocaleTimeString()}
              </div>
            )}

            {/* Expand/Collapse Toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded hover:bg-opacity-80 transition-colors"
              style={{ backgroundColor: C.hover, color: C.text }}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '⬇' : '⬆'}
            </button>

            {/* View Mode Toggle */}
            <button
              onClick={() => setShowAllSections(!showAllSections)}
              className="px-3 py-1 rounded text-sm transition-colors"
              style={{
                backgroundColor: showAllSections ? C.accentDim : C.hover,
                color: showAllSections ? C.accent : C.text,
              }}
              title="Toggle view mode"
            >
              {showAllSections ? 'Single' : 'All'}
            </button>

            {/* Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded hover:bg-opacity-80 transition-colors"
                style={{ backgroundColor: C.hover, color: C.textMuted }}
                title="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="flex h-full">
            {/* Section Navigation Sidebar */}
            <div className="w-64 border-r" style={{ borderColor: C.border, backgroundColor: C.surfaceAlt }}>
              <div className="p-4">
                <h3 className="text-sm font-semibold mb-3" style={{ color: C.textMuted }}>
                  SECTIONS
                </h3>

                <div className="space-y-2">
                  {Object.entries(SECTION_CONFIG).map(([key, config]) => {
                    const sectionKey = key as SectionName;
                    const status = getSectionStatus(sectionKey);
                    const isActive = activeSection === sectionKey;

                    return (
                      <button
                        key={key}
                        onClick={() => setActiveSection(sectionKey)}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                          isActive ? 'shadow-sm' : ''
                        }`}
                        style={{
                          backgroundColor: isActive ? C.hover : 'transparent',
                          borderLeft: isActive ? `3px solid ${C.accent}` : '3px solid transparent',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{config.icon}</span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span
                                className={`font-medium text-sm ${isActive ? '' : 'text-opacity-80'}`}
                                style={{ color: C.text }}
                              >
                                {config.title}
                              </span>
                              <SpecificationStatusIndicator status={status} size="sm" />
                            </div>

                            <p
                              className="text-xs mt-1 leading-tight"
                              style={{ color: C.textMuted }}
                            >
                              {config.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto">
              {showAllSections ? (
                /* All Sections View */
                <div className="p-6 space-y-8">
                  {Object.entries(SECTION_CONFIG).map(([key, config]) => {
                    const sectionKey = key as SectionName;
                    const sectionData = specification?.sections[sectionKey];

                    return (
                      <div key={key} className="space-y-4">
                        <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: C.border }}>
                          <span className="text-xl">{config.icon}</span>
                          <h3 className="text-lg font-semibold" style={{ color: C.text }}>
                            {config.title}
                          </h3>
                          <SpecificationStatusIndicator
                            status={getSectionStatus(sectionKey)}
                            size="md"
                            showText
                          />
                        </div>

                        <Controller
                          name={`sections.${sectionKey}`}
                          control={form.control}
                          render={({ field }) => (
                            <SpecificationSection
                              sectionName={sectionKey}
                              control={form.control}
                              sectionData={sectionData}
                              workItemId={workItemId}
                              onStatusChange={(status) => {
                                // Status updates are handled by the hook
                              }}
                            />
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Single Section View */
                <div className="p-6">
                  <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-2xl">{SECTION_CONFIG[activeSection].icon}</span>
                        <h3 className="text-xl font-semibold" style={{ color: C.text }}>
                          {SECTION_CONFIG[activeSection].title}
                        </h3>
                        <SpecificationStatusIndicator
                          status={getSectionStatus(activeSection)}
                          size="lg"
                          showText
                        />
                      </div>

                      <p className="text-sm" style={{ color: C.textMuted }}>
                        {SECTION_CONFIG[activeSection].description}
                      </p>
                    </div>

                    <Controller
                      name={`sections.${activeSection}`}
                      control={form.control}
                      render={({ field }) => (
                        <SpecificationSection
                          sectionName={activeSection}
                          control={form.control}
                          sectionData={specification?.sections[activeSection]}
                          workItemId={workItemId}
                          onStatusChange={(status) => {
                            // Status updates are handled by the hook
                          }}
                        />
                      )}
                    />

                    {/* Navigation buttons */}
                    <div className="flex justify-between mt-8 pt-6 border-t" style={{ borderColor: C.border }}>
                      <button
                        onClick={() => {
                          const sections = Object.keys(SECTION_CONFIG) as SectionName[];
                          const currentIndex = sections.indexOf(activeSection);
                          const prevIndex = currentIndex > 0 ? currentIndex - 1 : sections.length - 1;
                          setActiveSection(sections[prevIndex]);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded transition-colors"
                        style={{ backgroundColor: C.hover, color: C.text }}
                      >
                        ← Previous
                      </button>

                      <div className="flex items-center gap-2">
                        {Object.keys(SECTION_CONFIG).map((key, index) => (
                          <button
                            key={key}
                            onClick={() => setActiveSection(key as SectionName)}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              activeSection === key ? 'opacity-100' : 'opacity-40'
                            }`}
                            style={{
                              backgroundColor: activeSection === key ? C.accent : C.textMuted,
                            }}
                            title={SECTION_CONFIG[key as SectionName].title}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          const sections = Object.keys(SECTION_CONFIG) as SectionName[];
                          const currentIndex = sections.indexOf(activeSection);
                          const nextIndex = (currentIndex + 1) % sections.length;
                          setActiveSection(sections[nextIndex]);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded transition-colors"
                        style={{ backgroundColor: C.hover, color: C.text }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Help */}
        {variant === 'full' && (
          <div className="absolute bottom-4 left-4 text-xs p-3 rounded" style={{ backgroundColor: C.surfaceAlt, color: C.textMuted }}>
            <div>Shortcuts: Ctrl+S (Save) • Ctrl+Tab (Next Section)</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SpecificationEditor;