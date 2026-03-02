'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Control, Controller } from 'react-hook-form';
import { SpecificationStatusIndicator } from './SpecificationStatusIndicator';
import { updateSpecificationSection } from '../../utils/api';

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

export type SectionStatus = 'empty' | 'draft' | 'review' | 'complete';

export interface SpecificationSectionData {
  content: string;
  status: SectionStatus;
  wordCount: number;
  lastUpdated: string;
}

export interface SpecificationSectionProps {
  sectionName: string;
  control: Control<any>;
  sectionData?: SpecificationSectionData;
  onStatusChange?: (status: SectionStatus) => void;
  workItemId?: string;
  disabled?: boolean;
  placeholder?: string;
}

// Section-specific placeholder text
const SECTION_PLACEHOLDERS: Record<string, string> = {
  requirements: "Define functional requirements, user stories, acceptance criteria, and business rules...",
  design: "Describe architecture, data models, API design, and technical specifications...",
  frontend: "Detail UI/UX components, user flows, responsive design, and frontend implementation...",
  backend: "Outline server architecture, database design, APIs, and backend services...",
  integration: "Define system integrations, external APIs, data flows, and communication protocols...",
  test: "Specify test cases, testing strategy, quality assurance criteria, and validation methods...",
};

// Status determination based on content
function determineStatus(content: string, wordCount: number): SectionStatus {
  if (!content || content.trim().length === 0) return 'empty';
  if (wordCount < 20) return 'draft';
  if (wordCount < 100) return 'review';
  return 'complete';
}

// Border color based on section status
function getBorderColor(status: SectionStatus): string {
  switch (status) {
    case 'empty': return C.border;
    case 'draft': return C.yellow;
    case 'review': return C.accent;
    case 'complete': return C.green;
    default: return C.border;
  }
}

export function SpecificationSection({
  sectionName,
  control,
  sectionData,
  onStatusChange,
  workItemId,
  disabled = false,
  placeholder
}: SpecificationSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

  // Auto-save debounce timer
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Get section-specific placeholder
  const sectionPlaceholder = useMemo(() => {
    return placeholder || SECTION_PLACEHOLDERS[sectionName.toLowerCase()] || `Enter ${sectionName.toLowerCase()} details...`;
  }, [placeholder, sectionName]);

  // Calculate word count
  const calculateWordCount = useCallback((text: string): number => {
    if (!text || text.trim().length === 0) return 0;
    return text.trim().split(/\s+/).length;
  }, []);

  // Auto-save function with debouncing
  const handleAutoSave = useCallback(async (content: string, currentStatus: SectionStatus) => {
    if (!workItemId) return;

    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set new debounced timer
    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const wordCount = calculateWordCount(content);
        const sectionUpdate: SpecificationSectionData = {
          content,
          status: currentStatus,
          wordCount,
          lastUpdated: new Date().toISOString(),
        };

        await updateSpecificationSection(workItemId, sectionName, sectionUpdate);
        setLastAutoSave(new Date());

        // Notify parent of status change
        onStatusChange?.(currentStatus);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save changes');
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce delay

    setAutoSaveTimer(timer);
  }, [workItemId, sectionName, onStatusChange, autoSaveTimer, calculateWordCount]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3
            className="text-sm font-semibold capitalize"
            style={{ color: C.text }}
          >
            {sectionName}
          </h3>

          {sectionData && (
            <SpecificationStatusIndicator
              status={sectionData.status}
              size="sm"
            />
          )}
        </div>

        {/* Word count and last saved indicator */}
        <div className="flex items-center gap-3 text-xs" style={{ color: C.textMuted }}>
          {sectionData && (
            <span>
              {sectionData.wordCount} words
            </span>
          )}

          {lastAutoSave && (
            <span className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: C.green }}
              />
              Saved {lastAutoSave.toLocaleTimeString()}
            </span>
          )}

          {isLoading && (
            <span className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: C.yellow }}
              />
              Saving...
            </span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="text-xs p-2 rounded border"
          style={{
            color: C.red,
            backgroundColor: C.redDim,
            borderColor: C.red
          }}
        >
          {error}
        </div>
      )}

      {/* Section Content */}
      <Controller
        name={`sections.${sectionName.toLowerCase()}`}
        control={control}
        defaultValue={sectionData?.content || ''}
        render={({ field, fieldState }) => {
          const wordCount = calculateWordCount(field.value || '');
          const currentStatus = determineStatus(field.value || '', wordCount);
          const borderColor = getBorderColor(currentStatus);

          return (
            <div className="space-y-2">
              <textarea
                {...field}
                disabled={disabled || isLoading}
                placeholder={sectionPlaceholder}
                className="w-full min-h-[120px] p-3 rounded-lg resize-vertical transition-all duration-200 focus:outline-none"
                style={{
                  backgroundColor: disabled ? C.surfaceAlt : C.surface,
                  border: `1.5px solid ${fieldState.error ? C.red : borderColor}`,
                  color: C.text,
                  fontSize: '14px',
                  lineHeight: '1.5',
                }}
                onChange={(e) => {
                  field.onChange(e);

                  // Update section data and trigger auto-save
                  const newWordCount = calculateWordCount(e.target.value);
                  const newStatus = determineStatus(e.target.value, newWordCount);

                  // Call auto-save with debouncing
                  handleAutoSave(e.target.value, newStatus);
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = C.borderActive;
                }}
                onBlur={(e) => {
                  const currentStatus = determineStatus(field.value || '', wordCount);
                  e.target.style.borderColor = getBorderColor(currentStatus);
                }}
              />

              {/* Field Error */}
              {fieldState.error && (
                <div
                  className="text-xs"
                  style={{ color: C.red }}
                >
                  {fieldState.error.message}
                </div>
              )}
            </div>
          );
        }}
      />

      {/* Section Footer - Status Summary */}
      {sectionData && (
        <div className="flex justify-between items-center text-xs pt-2 border-t" style={{ borderColor: C.border, color: C.textMuted }}>
          <div className="flex items-center gap-3">
            <span>Status: {sectionData.status}</span>
            <span>•</span>
            <span>Words: {sectionData.wordCount}</span>
          </div>

          {sectionData.lastUpdated && (
            <span>
              Updated: {new Date(sectionData.lastUpdated).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default SpecificationSection;