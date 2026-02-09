'use client';

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useReadinessStore, ReadinessState, validateTransition } from '@/stores/readinessStore';
import ReadinessIndicator from './ReadinessIndicator';

// Validation schema
const readinessSchema = z.object({
  design: z.number().min(0).max(100),
  backend: z.number().min(0).max(100),
  frontend: z.number().min(0).max(100),
  integration: z.number().min(0).max(100),
  test: z.number().min(0).max(100),
  deployment: z.number().min(0).max(100),
});

type ReadinessFormData = z.infer<typeof readinessSchema>;

interface ReadinessFormProps {
  nodeId: string;
  onClose?: () => void;
  onSave?: (nodeId: string, data: ReadinessFormData) => void;
  isBulkMode?: boolean;
  selectedNodeIds?: string[];
}

const DIMENSIONS = [
  { key: 'design', label: 'Design', description: 'UI/UX design and wireframes' },
  { key: 'backend', label: 'Backend', description: 'Server-side logic and APIs' },
  { key: 'frontend', label: 'Frontend', description: 'Client-side implementation' },
  { key: 'integration', label: 'Integration', description: 'System integration and connections' },
  { key: 'test', label: 'Test', description: 'Testing and quality assurance' },
  { key: 'deployment', label: 'Deployment', description: 'Production deployment ready' },
] as const;

const QUICK_ACTIONS = [
  { label: 'Mark All Complete', values: { design: 100, backend: 100, frontend: 100, integration: 100, test: 100, deployment: 100 } },
  { label: 'Reset All', values: { design: 0, backend: 0, frontend: 0, integration: 0, test: 0, deployment: 0 } },
  { label: 'Design Complete', values: { design: 100 } },
  { label: 'Development Ready', values: { design: 100, backend: 0, frontend: 0 } },
] as const;

const ReadinessForm: React.FC<ReadinessFormProps> = ({
  nodeId,
  onClose,
  onSave,
  isBulkMode = false,
  selectedNodeIds = [],
}) => {
  const {
    readinessData,
    displayMode,
    updateReadiness,
    bulkUpdateReadiness,
    errors,
    configurations,
    selectedConfiguration,
  } = useReadinessStore();

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const currentReadiness = readinessData.get(nodeId);
  const config = configurations.find(c => c.id === selectedConfiguration);

  const {
    register,
    handleSubmit,
    formState: { errors: formErrors, isDirty },
    watch,
    setValue,
    getValues,
    reset,
  } = useForm<ReadinessFormData>({
    resolver: zodResolver(readinessSchema),
    defaultValues: currentReadiness ? {
      design: currentReadiness.design,
      backend: currentReadiness.backend,
      frontend: currentReadiness.frontend,
      integration: currentReadiness.integration,
      test: currentReadiness.test,
      deployment: currentReadiness.deployment,
    } : {
      design: 0,
      backend: 0,
      frontend: 0,
      integration: 0,
      test: 0,
      deployment: 0,
    },
    mode: 'onChange',
  });

  const watchedValues = watch();

  // Validate business rules in real-time
  useEffect(() => {
    if (currentReadiness) {
      const validation = validateTransition(currentReadiness, watchedValues, config);
      setValidationErrors(validation.errors);
    }
    setHasUnsavedChanges(isDirty);
  }, [watchedValues, currentReadiness, config, isDirty]);

  const onSubmit: SubmitHandler<ReadinessFormData> = (data) => {
    if (validationErrors.length > 0) {
      return;
    }

    if (isBulkMode && selectedNodeIds.length > 0) {
      const updates = selectedNodeIds.map(id => ({
        nodeId: id,
        readiness: data,
      }));
      bulkUpdateReadiness(updates);
    } else {
      updateReadiness(nodeId, data);
    }

    if (onSave) {
      onSave(nodeId, data);
    }

    setHasUnsavedChanges(false);
  };

  const handleQuickAction = (values: Partial<ReadinessFormData>) => {
    Object.entries(values).forEach(([key, value]) => {
      setValue(key as keyof ReadinessFormData, value, { shouldValidate: true, shouldDirty: true });
    });
  };

  const getStateDisplay = (value: number) => {
    if (config && config.states.length > 0) {
      const state = config.states.find(s => s.value <= value) || config.states[0];
      return state.label;
    }
    return `${value}%`;
  };

  const getDimensionColor = (value: number) => {
    if (value >= 80) return 'text-green-600 bg-green-50';
    if (value >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formError = errors.get(isBulkMode ? 'bulk' : nodeId);

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {isBulkMode ? `Update ${selectedNodeIds.length} Nodes` : 'Update Readiness'}
          </h2>
          {!isBulkMode && currentReadiness && (
            <p className="text-sm text-gray-500">Node: {nodeId}</p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {currentReadiness && (
            <ReadinessIndicator
              readiness={{ ...currentReadiness, ...watchedValues, nodeId }}
              variant="large"
              displayMode={displayMode}
            />
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Quick Actions</label>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleQuickAction(action.values)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Validation Errors */}
        {(validationErrors.length > 0 || formError) && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-red-800 mb-2">Validation Errors</h3>
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
              {formError && <li>• {formError}</li>}
            </ul>
          </div>
        )}

        {/* Dimensions */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Readiness Dimensions</h3>
          {DIMENSIONS.map((dimension, index) => {
            const value = watchedValues[dimension.key] || 0;
            const fieldError = formErrors[dimension.key];

            return (
              <div key={dimension.key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label htmlFor={dimension.key} className="block text-sm font-medium text-gray-900">
                      {dimension.label}
                    </label>
                    <p className="text-xs text-gray-500">{dimension.description}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-xs font-medium ${getDimensionColor(value)}`}>
                    {getStateDisplay(value)}
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Slider */}
                  <input
                    {...register(dimension.key, { valueAsNumber: true })}
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #EF4444 0%, #F59E0B 50%, #10B981 100%)`,
                    }}
                  />

                  {/* Numeric input */}
                  <div className="flex items-center space-x-2">
                    <input
                      {...register(dimension.key, { valueAsNumber: true })}
                      type="number"
                      min="0"
                      max="100"
                      className="w-20 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>

                  {/* Field error */}
                  {fieldError && (
                    <p className="text-sm text-red-600">{fieldError.message}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div className="flex space-x-2">
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={() => {
                  reset();
                  setHasUnsavedChanges(false);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Reset Changes
              </button>
            )}
          </div>
          <div className="flex space-x-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={validationErrors.length > 0 || Object.keys(formErrors).length > 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isBulkMode ? `Update ${selectedNodeIds.length} Nodes` : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ReadinessForm;