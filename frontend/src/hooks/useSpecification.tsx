import { useState, useCallback, useEffect, useRef } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  SpecificationTemplate,
  SpecificationSection,
  SpecificationValidationResult,
  getSpecification,
  updateSpecification,
  updateSpecificationSection,
  validateSpecification,
  ValidationError,
  APIError
} from '../utils/api';

// Zod schemas for validation
const SpecificationSectionSchema = z.object({
  content: z.string().default(''),
  status: z.enum(['empty', 'draft', 'review', 'complete']).default('empty'),
  wordCount: z.number().min(0).default(0),
  lastUpdated: z.string().datetime().default(() => new Date().toISOString()),
});

const SpecificationTemplateSchema = z.object({
  id: z.string(),
  workItemId: z.string(),
  sections: z.object({
    requirements: SpecificationSectionSchema,
    design: SpecificationSectionSchema,
    frontend: SpecificationSectionSchema,
    backend: SpecificationSectionSchema,
    integration: SpecificationSectionSchema,
    test: SpecificationSectionSchema,
  }),
  overallStatus: z.enum(['empty', 'draft', 'review', 'complete']).default('empty'),
  completionPercentage: z.number().min(0).max(100).default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SpecificationFormData = z.infer<typeof SpecificationTemplateSchema>;

interface UseSpecificationState {
  loading: boolean;
  saving: boolean;
  error: string | null;
  lastSaved: Date | null;
  isDirty: boolean;
}

interface UseSpecificationReturn {
  // Form state
  form: UseFormReturn<SpecificationFormData>;
  state: UseSpecificationState;

  // Data operations
  specification: SpecificationTemplate | null;
  refreshSpecification: () => Promise<void>;

  // Section operations
  updateSection: (sectionName: keyof SpecificationFormData['sections'], content: string) => Promise<void>;
  getSectionStatus: (sectionName: keyof SpecificationFormData['sections']) => 'empty' | 'draft' | 'review' | 'complete';

  // Completion tracking
  getCompletionPercentage: () => number;
  getOverallStatus: () => 'empty' | 'draft' | 'review' | 'complete';

  // Validation
  validateSection: (sectionName: keyof SpecificationFormData['sections']) => Promise<SpecificationValidationResult | null>;
  validateSpecification: () => Promise<SpecificationValidationResult | null>;
}

// Helper function to calculate word count
function calculateWordCount(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return text.trim().split(/\s+/).length;
}

// Helper function to determine section status based on content
function calculateSectionStatus(content: string, wordCount: number): 'empty' | 'draft' | 'review' | 'complete' {
  if (wordCount === 0) return 'empty';
  if (wordCount < 50) return 'draft';
  if (wordCount < 200) return 'review';
  return 'complete';
}

// Helper function to calculate overall completion percentage
function calculateCompletionPercentage(sections: SpecificationFormData['sections']): number {
  const sectionNames = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'] as const;
  const weights = { empty: 0, draft: 0.25, review: 0.75, complete: 1.0 };

  const totalWeight = sectionNames.reduce((sum, sectionName) => {
    const section = sections[sectionName];
    return sum + weights[section.status];
  }, 0);

  return Math.round((totalWeight / sectionNames.length) * 100);
}

// Helper function to determine overall status
function calculateOverallStatus(sections: SpecificationFormData['sections']): 'empty' | 'draft' | 'review' | 'complete' {
  const sectionNames = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'] as const;
  const statuses = sectionNames.map(name => sections[name].status);

  if (statuses.every(status => status === 'empty')) return 'empty';
  if (statuses.every(status => status === 'complete')) return 'complete';
  if (statuses.some(status => status === 'review' || status === 'complete')) return 'review';
  return 'draft';
}

export function useSpecification(workItemId: string): UseSpecificationReturn {
  // State management
  const [state, setState] = useState<UseSpecificationState>({
    loading: true,
    saving: false,
    error: null,
    lastSaved: null,
    isDirty: false,
  });

  const [specification, setSpecification] = useState<SpecificationTemplate | null>(null);

  // Auto-save timeout refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const saveInProgressRef = useRef(false);
  const mountedRef = useRef(true);

  // Form setup with default values
  const form = useForm<SpecificationFormData>({
    resolver: zodResolver(SpecificationTemplateSchema),
    defaultValues: {
      id: `spec-${workItemId}`,
      workItemId,
      sections: {
        requirements: { content: '', status: 'empty', wordCount: 0, lastUpdated: new Date().toISOString() },
        design: { content: '', status: 'empty', wordCount: 0, lastUpdated: new Date().toISOString() },
        frontend: { content: '', status: 'empty', wordCount: 0, lastUpdated: new Date().toISOString() },
        backend: { content: '', status: 'empty', wordCount: 0, lastUpdated: new Date().toISOString() },
        integration: { content: '', status: 'empty', wordCount: 0, lastUpdated: new Date().toISOString() },
        test: { content: '', status: 'empty', wordCount: 0, lastUpdated: new Date().toISOString() },
      },
      overallStatus: 'empty',
      completionPercentage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Load specification data
  const refreshSpecification = useCallback(async () => {
    if (!workItemId) {
      setState(prev => ({ ...prev, error: 'Work item ID is required', loading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const spec = await getSpecification(workItemId);

      if (!mountedRef.current) return;

      setSpecification(spec);

      // Update form with loaded data
      form.reset(spec);

      setState(prev => ({
        ...prev,
        loading: false,
        error: null,
        isDirty: false,
        lastSaved: new Date(),
      }));
    } catch (error) {
      if (!mountedRef.current) return;

      console.error('Error loading specification:', error);
      const errorMessage = error instanceof APIError ? error.message : 'Failed to load specification';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
    }
  }, [workItemId, form]);

  // Auto-save function with debounce
  const performAutoSave = useCallback(async (formData: SpecificationFormData) => {
    if (saveInProgressRef.current || !workItemId) return;

    try {
      saveInProgressRef.current = true;
      setState(prev => ({ ...prev, saving: true, error: null }));

      // Update timestamps
      const now = new Date().toISOString();
      const updatedSpec: SpecificationTemplate = {
        ...formData,
        updatedAt: now,
      };

      const savedSpec = await updateSpecification(workItemId, updatedSpec);

      if (!mountedRef.current) return;

      setSpecification(savedSpec);
      setState(prev => ({
        ...prev,
        saving: false,
        error: null,
        lastSaved: new Date(),
        isDirty: false,
      }));
    } catch (error) {
      if (!mountedRef.current) return;

      console.error('Auto-save error:', error);
      const errorMessage = error instanceof APIError ? error.message : 'Auto-save failed';
      setState(prev => ({ ...prev, saving: false, error: errorMessage }));
    } finally {
      saveInProgressRef.current = false;
    }
  }, [workItemId]);

  // Update section with auto-save and optimistic updates
  const updateSection = useCallback(async (
    sectionName: keyof SpecificationFormData['sections'],
    content: string
  ) => {
    if (!workItemId) {
      throw new ValidationError('Work item ID is required');
    }

    // Calculate new section metadata
    const wordCount = calculateWordCount(content);
    const status = calculateSectionStatus(content, wordCount);
    const lastUpdated = new Date().toISOString();

    const updatedSection: SpecificationSection = {
      content,
      status,
      wordCount,
      lastUpdated,
    };

    // Optimistic update - update form immediately
    const currentData = form.getValues();
    const updatedSections = {
      ...currentData.sections,
      [sectionName]: updatedSection,
    };

    const updatedFormData: SpecificationFormData = {
      ...currentData,
      sections: updatedSections,
      overallStatus: calculateOverallStatus(updatedSections),
      completionPercentage: calculateCompletionPercentage(updatedSections),
      updatedAt: lastUpdated,
    };

    // Update form values
    form.setValue('sections', updatedSections);
    form.setValue('overallStatus', updatedFormData.overallStatus);
    form.setValue('completionPercentage', updatedFormData.completionPercentage);
    form.setValue('updatedAt', lastUpdated);

    setState(prev => ({ ...prev, isDirty: true }));

    // Clear existing auto-save timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new auto-save timeout (500ms debounce)
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave(updatedFormData);
    }, 500);

  }, [workItemId, form, performAutoSave]);

  // Get section status
  const getSectionStatus = useCallback((sectionName: keyof SpecificationFormData['sections']) => {
    const sections = form.getValues('sections');
    return sections[sectionName]?.status || 'empty';
  }, [form]);

  // Get completion percentage
  const getCompletionPercentage = useCallback(() => {
    const sections = form.getValues('sections');
    return calculateCompletionPercentage(sections);
  }, [form]);

  // Get overall status
  const getOverallStatus = useCallback(() => {
    const sections = form.getValues('sections');
    return calculateOverallStatus(sections);
  }, [form]);

  // Validate section
  const validateSectionFn = useCallback(async (
    sectionName: keyof SpecificationFormData['sections']
  ): Promise<SpecificationValidationResult | null> => {
    if (!workItemId) return null;

    try {
      const result = await validateSpecification(workItemId);
      return result;
    } catch (error) {
      console.error('Section validation error:', error);
      return null;
    }
  }, [workItemId]);

  // Validate entire specification
  const validateSpecificationFn = useCallback(async (): Promise<SpecificationValidationResult | null> => {
    if (!workItemId) return null;

    try {
      const result = await validateSpecification(workItemId);
      return result;
    } catch (error) {
      console.error('Specification validation error:', error);
      return null;
    }
  }, [workItemId]);

  // Load initial data on mount or workItemId change
  useEffect(() => {
    if (workItemId) {
      refreshSpecification();
    }
  }, [workItemId, refreshSpecification]);

  return {
    // Form state
    form,
    state,

    // Data operations
    specification,
    refreshSpecification,

    // Section operations
    updateSection,
    getSectionStatus,

    // Completion tracking
    getCompletionPercentage,
    getOverallStatus,

    // Validation
    validateSection: validateSectionFn,
    validateSpecification: validateSpecificationFn,
  };
}