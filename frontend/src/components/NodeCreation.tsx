/**
 * Interactive node creation interface
 * Provides form-based work item creation with backend integration
 */

'use client';

import { useState, useCallback } from 'react';
import { CreateNodeRequest } from '../lib/graphTypes';

export interface NodeCreationPanelProps {
  isVisible: boolean;
  position?: { x: number; y: number };
  onCreateNode: (request: CreateNodeRequest) => Promise<void>;
  onCancel: () => void;
}

export function NodeCreationPanel({
  isVisible,
  position,
  onCreateNode,
  onCancel,
}: NodeCreationPanelProps) {
  const [formData, setFormData] = useState({
    label: '',
    description: '',
    type: 'feature',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setFormData({
      label: '',
      description: '',
      type: 'feature',
    });
    setError(null);
    setIsSubmitting(false);
  }, []);

  const handleCancel = useCallback(() => {
    resetForm();
    onCancel();
  }, [resetForm, onCancel]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.label.trim()) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const request: CreateNodeRequest = {
        label: formData.label.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        position,
      };

      await onCreateNode(request);
      resetForm();
    } catch (error) {
      console.error('Failed to create node:', error);
      setError(error instanceof Error ? error.message : 'Failed to create node');
      setIsSubmitting(false);
    }
  }, [formData, position, onCreateNode, resetForm]);

  const handleInputChange = useCallback((field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  }, [error]);

  if (!isVisible) return null;

  return (
    <div className="absolute top-4 right-4 z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Create Work Item</h3>
        {position && (
          <p className="text-sm text-gray-500">
            Position: ({position.x.toFixed(0)}, {position.y.toFixed(0)})
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div>
          <label htmlFor="node-name" className="block text-sm font-medium text-gray-700">
            Name *
          </label>
          <input
            id="node-name"
            type="text"
            value={formData.label}
            onChange={(e) => handleInputChange('label', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter work item name"
            disabled={isSubmitting}
            autoFocus
            maxLength={100}
          />
        </div>

        {/* Description Field */}
        <div>
          <label htmlFor="node-description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="node-description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Brief description (optional)"
            disabled={isSubmitting}
            rows={3}
            maxLength={500}
          />
        </div>

        {/* Type Field */}
        <div>
          <label htmlFor="node-type" className="block text-sm font-medium text-gray-700">
            Type
          </label>
          <select
            id="node-type"
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            disabled={isSubmitting}
          >
            <option value="feature">Feature</option>
            <option value="bug">Bug Fix</option>
            <option value="task">Task</option>
            <option value="epic">Epic</option>
            <option value="story">User Story</option>
            <option value="technical">Technical Work</option>
          </select>
        </div>

        {/* Error Display */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !formData.label.trim()}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Node'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 bg-gray-200 text-gray-800 text-sm font-medium py-2 px-3 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// Character count indicators for better UX
function CharacterCount({ current, max, className = "" }: { current: number; max: number; className?: string }) {
  const isNearLimit = current > max * 0.8;
  const isOverLimit = current > max;

  return (
    <div className={`text-xs ${isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'} ${className}`}>
      {current}/{max}
    </div>
  );
}