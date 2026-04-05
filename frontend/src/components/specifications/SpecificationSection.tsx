'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Control, Controller } from 'react-hook-form';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
function determineStatus(content: string | any, wordCount: number): SectionStatus {
  // Handle both string and object input
  const text = typeof content === 'string' ? content : (content?.content || '');
  if (!text || text.trim().length === 0) return 'empty';
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
  // Use refs for save state to avoid re-renders that steal focus
  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveStatusRef = useRef<{ isLoading: boolean; lastAutoSave: Date | null }>({ isLoading: false, lastAutoSave: null });
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Force-update trigger only for save status display (non-critical)
  const [, forceUpdate] = useState(0);

  // Get section-specific placeholder
  const sectionPlaceholder = useMemo(() => {
    return placeholder || SECTION_PLACEHOLDERS[sectionName.toLowerCase()] || `Enter ${sectionName.toLowerCase()} details...`;
  }, [placeholder, sectionName]);

  // Calculate word count
  const calculateWordCount = useCallback((text: string | any): number => {
    // Handle both string and object input
    const content = typeof text === 'string' ? text : (text?.content || '');
    if (!content || content.trim().length === 0) return 0;
    return content.trim().split(/\s+/).length;
  }, []);

  // Auto-save function with debouncing — uses refs to avoid re-renders
  const handleAutoSave = useCallback(async (content: string, currentStatus: SectionStatus) => {
    if (!workItemId) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new debounced timer
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        saveStatusRef.current.isLoading = true;

        const wordCount = calculateWordCount(content);
        const sectionUpdate: SpecificationSectionData = {
          content,
          status: currentStatus,
          wordCount,
          lastUpdated: new Date().toISOString(),
        };

        await updateSpecificationSection(workItemId, sectionName, sectionUpdate);
        saveStatusRef.current.lastAutoSave = new Date();
        saveStatusRef.current.isLoading = false;

        // Notify parent of status change
        onStatusChange?.(currentStatus);

        // Update display only when textarea is NOT focused (so we don't steal focus)
        if (document.activeElement !== textareaRef.current) {
          forceUpdate(n => n + 1);
        }
      } catch (err) {
        saveStatusRef.current.isLoading = false;
        // Only set error state for real errors (not 404s — those are handled in api.ts)
        setError(err instanceof Error ? err.message : 'Failed to save changes');
      }
    }, 1000); // 1s debounce delay (longer to reduce save frequency)
  }, [workItemId, sectionName, onStatusChange, calculateWordCount]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Prevent spacebar from causing navigation issues
  useEffect(() => {
    const preventSpacebarNavigation = (e: Event) => {
      // If the event is happening in a textarea, prevent it from bubbling up
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    // Listen to all form submissions and prevent them
    const preventFormSubmit = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Add listeners
    document.addEventListener('keydown', preventSpacebarNavigation, true);
    document.addEventListener('submit', preventFormSubmit, true);

    return () => {
      document.removeEventListener('keydown', preventSpacebarNavigation, true);
      document.removeEventListener('submit', preventFormSubmit, true);
    };
  }, []);

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
          {/* Preview/Edit toggle */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsPreview(false)}
              className={`px-2 py-1 rounded transition-all ${!isPreview ? 'font-medium' : ''}`}
              style={{
                backgroundColor: !isPreview ? C.blueDim : 'transparent',
                color: !isPreview ? C.blue : C.textMuted,
              }}
              disabled={disabled}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setIsPreview(true)}
              className={`px-2 py-1 rounded transition-all ${isPreview ? 'font-medium' : ''}`}
              style={{
                backgroundColor: isPreview ? C.greenDim : 'transparent',
                color: isPreview ? C.green : C.textMuted,
              }}
              disabled={disabled}
            >
              Preview
            </button>
          </div>

          {sectionData && (
            <span>
              {sectionData.wordCount} words
            </span>
          )}

          {saveStatusRef.current.lastAutoSave && (
            <span className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: C.green }}
              />
              Saved {saveStatusRef.current.lastAutoSave.toLocaleTimeString()}
            </span>
          )}

          {saveStatusRef.current.isLoading && (
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
        shouldUnregister={false}
        render={({ field, fieldState }) => {
          // Extract content string from field value (might be object or string)
          const content = typeof field.value === 'string' ? field.value : (field.value?.content || '');
          const wordCount = calculateWordCount(content);
          const currentStatus = determineStatus(content, wordCount);
          const borderColor = getBorderColor(currentStatus);

          return (
            <div className="space-y-2">
              {isPreview ? (
                // Markdown preview mode
                <div
                  className="w-full min-h-[120px] p-3 rounded-lg"
                  style={{
                    backgroundColor: C.surface,
                    border: `1.5px solid ${borderColor}`,
                    color: C.text,
                  }}
                >
                  {content ? (
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                        h1: ({children}) => <h1 className="text-xl font-bold mb-3 mt-4" style={{color: C.text}}>{children}</h1>,
                        h2: ({children}) => <h2 className="text-lg font-semibold mb-2 mt-3" style={{color: C.text}}>{children}</h2>,
                        h3: ({children}) => <h3 className="text-base font-medium mb-2 mt-2" style={{color: C.text}}>{children}</h3>,
                        p: ({children}) => <p className="mb-2" style={{color: C.text, lineHeight: '1.5'}}>{children}</p>,
                        ul: ({children}) => <ul className="list-disc pl-5 mb-2" style={{color: C.text}}>{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal pl-5 mb-2" style={{color: C.text}}>{children}</ol>,
                        li: ({children}) => <li className="mb-1" style={{color: C.text}}>{children}</li>,
                        code: ({children, ...props}: any) =>
                          props.inline ? (
                            <code className="px-1 py-0.5 rounded" style={{backgroundColor: C.surfaceAlt, color: C.blue}}>
                              {children}
                            </code>
                          ) : (
                            <pre className="p-3 rounded mb-2 overflow-x-auto" style={{backgroundColor: C.surfaceAlt}}>
                              <code style={{color: C.text}}>{children}</code>
                            </pre>
                          ),
                        blockquote: ({children}) => (
                          <blockquote className="border-l-4 pl-3 my-2" style={{borderColor: C.border, color: C.textMuted}}>
                            {children}
                          </blockquote>
                        ),
                        a: ({children, href}) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{color: C.blue}}>
                            {children}
                          </a>
                        ),
                        hr: () => <hr className="my-3" style={{borderColor: C.border}} />,
                        table: ({children}) => (
                          <table className="w-full mb-2" style={{borderColor: C.border}}>
                            {children}
                          </table>
                        ),
                        th: ({children}) => (
                          <th className="p-2 text-left font-semibold" style={{borderBottom: `1px solid ${C.border}`, color: C.text}}>
                            {children}
                          </th>
                        ),
                        td: ({children}) => (
                          <td className="p-2" style={{borderBottom: `1px solid ${C.border}`, color: C.text}}>
                            {children}
                          </td>
                        ),
                      }}
                      >
                        {content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span style={{color: C.textMuted}}>{sectionPlaceholder}</span>
                  )}
                </div>
              ) : (
                // Edit mode with textarea
                <textarea
                  {...field}
                  ref={textareaRef}
                  value={content}
                  disabled={disabled}
                  placeholder={sectionPlaceholder}
                  className="w-full min-h-[120px] p-3 rounded-lg resize-vertical transition-all duration-200 focus:outline-none font-mono"
                  style={{
                    backgroundColor: disabled ? C.surfaceAlt : C.surface,
                    border: `1.5px solid ${fieldState.error ? C.red : borderColor}`,
                    color: C.text,
                    fontSize: '14px',
                    lineHeight: '1.5',
                  }}
                onKeyDown={(e) => {
                  // Stop all events from bubbling up when typing in the textarea
                  e.stopPropagation();

                  // Prevent spacebar from causing any default behavior (like form submission or button clicks)
                  if (e.key === ' ' || e.keyCode === 32) {
                    // Allow the space to be typed but prevent any other default behavior
                    e.stopPropagation();
                    // Don't prevent default as we want the space to be typed
                  }

                  // Allow Tab for indentation in textarea
                  if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    const target = e.target as HTMLTextAreaElement;
                    const start = target.selectionStart;
                    const end = target.selectionEnd;
                    const value = target.value;
                    target.value = value.substring(0, start) + '  ' + value.substring(end);
                    target.selectionStart = target.selectionEnd = start + 2;

                    // Trigger onChange manually after programmatic change
                    const event = new Event('input', { bubbles: true });
                    target.dispatchEvent(event);
                  }
                }}
                onKeyUp={(e) => {
                  e.stopPropagation();
                }}
                onKeyPress={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  // Prevent click events from bubbling up
                  e.stopPropagation();
                }}
                onFocus={(e) => {
                  e.stopPropagation();
                  e.target.style.borderColor = C.borderActive;
                }}
                onBlur={(e) => {
                  e.stopPropagation();
                  const currentStatus = determineStatus(content, wordCount);
                  e.target.style.borderColor = getBorderColor(currentStatus);
                }}
                onChange={(e) => {
                  // Update the field with the new content value
                  const newContent = e.target.value;

                  // If field value is an object, update just the content
                  if (typeof field.value === 'object' && field.value !== null) {
                    field.onChange({
                      ...field.value,
                      content: newContent,
                      wordCount: calculateWordCount(newContent),
                      status: determineStatus(newContent, calculateWordCount(newContent)),
                      lastUpdated: new Date().toISOString()
                    });
                  } else {
                    field.onChange(newContent);
                  }

                  // Update section data and trigger auto-save
                  const newWordCount = calculateWordCount(newContent);
                  const newStatus = determineStatus(newContent, newWordCount);

                  // Call auto-save with debouncing
                  handleAutoSave(newContent, newStatus);
                }}
                />
              )}

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