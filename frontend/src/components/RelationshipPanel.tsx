/**
 * Typed relationship creation UI
 * Provides interface for creating connections between nodes with distinct relationship types
 */

'use client';

import { useState, useCallback } from 'react';
import { RelationshipType, CreateRelationshipRequest } from '../lib/graphTypes';

export interface RelationshipPanelProps {
  isVisible: boolean;
  sourceNodeId?: string | null;
  sourceNodeLabel?: string;
  availableTargets: { id: string; label: string }[];
  onCreateRelationship: (request: CreateRelationshipRequest) => Promise<void>;
  onCancel: () => void;
}

const RELATIONSHIP_TYPES: { type: RelationshipType; label: string; description: string; color: string }[] = [
  {
    type: 'blocks',
    label: 'Blocks',
    description: 'This work item prevents the target from starting',
    color: 'red'
  },
  {
    type: 'requires',
    label: 'Requires',
    description: 'This work item needs the target to be completed first',
    color: 'blue'
  },
  {
    type: 'feeds-into',
    label: 'Feeds Into',
    description: 'This work item provides input to the target',
    color: 'green'
  },
  {
    type: 'tested-by',
    label: 'Tested By',
    description: 'This work item is verified by the target test',
    color: 'orange'
  },
  {
    type: 'deployed-with',
    label: 'Deployed With',
    description: 'This work item ships together with the target',
    color: 'purple'
  }
];

export function RelationshipPanel({
  isVisible,
  sourceNodeId,
  sourceNodeLabel,
  availableTargets,
  onCreateRelationship,
  onCancel,
}: RelationshipPanelProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedRelationType, setSelectedRelationType] = useState<RelationshipType>('requires');
  const [customLabel, setCustomLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setSelectedTargetId('');
    setSelectedRelationType('requires');
    setCustomLabel('');
    setError(null);
    setIsSubmitting(false);
  }, []);

  const handleCancel = useCallback(() => {
    resetForm();
    onCancel();
  }, [resetForm, onCancel]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceNodeId) {
      setError('No source node selected');
      return;
    }

    if (!selectedTargetId) {
      setError('Please select a target node');
      return;
    }

    if (selectedTargetId === sourceNodeId) {
      setError('Cannot create relationship to the same node');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const request: CreateRelationshipRequest = {
        sourceNodeId,
        targetNodeId: selectedTargetId,
        type: selectedRelationType,
        label: customLabel.trim() || undefined,
      };

      await onCreateRelationship(request);
      resetForm();
    } catch (error) {
      console.error('Failed to create relationship:', error);
      setError(error instanceof Error ? error.message : 'Failed to create relationship');
      setIsSubmitting(false);
    }
  }, [sourceNodeId, selectedTargetId, selectedRelationType, customLabel, onCreateRelationship, resetForm]);

  if (!isVisible || !sourceNodeId) return null;

  const selectedRelationshipType = RELATIONSHIP_TYPES.find(rt => rt.type === selectedRelationType);
  const targetOptions = availableTargets.filter(target => target.id !== sourceNodeId);

  return (
    <div className="absolute top-4 left-4 z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-96">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Create Relationship</h3>
        <p className="text-sm text-gray-600">
          From: <span className="font-medium">{sourceNodeLabel}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Relationship Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relationship Type
          </label>
          <div className="space-y-2">
            {RELATIONSHIP_TYPES.map((relationshipType) => (
              <div key={relationshipType.type} className="flex items-start">
                <input
                  type="radio"
                  id={`rel-type-${relationshipType.type}`}
                  name="relationshipType"
                  value={relationshipType.type}
                  checked={selectedRelationType === relationshipType.type}
                  onChange={(e) => setSelectedRelationType(e.target.value as RelationshipType)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={isSubmitting}
                />
                <div className="ml-3 flex-1">
                  <label
                    htmlFor={`rel-type-${relationshipType.type}`}
                    className="block text-sm font-medium text-gray-900 cursor-pointer"
                  >
                    <span
                      className={`inline-block w-3 h-3 rounded-full mr-2 ${
                        relationshipType.color === 'red' ? 'bg-red-500' :
                        relationshipType.color === 'blue' ? 'bg-blue-500' :
                        relationshipType.color === 'green' ? 'bg-green-500' :
                        relationshipType.color === 'orange' ? 'bg-orange-500' :
                        relationshipType.color === 'purple' ? 'bg-purple-500' :
                        'bg-gray-500'
                      }`}
                    />
                    {relationshipType.label}
                  </label>
                  <p className="text-xs text-gray-500">{relationshipType.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Target Node Selection */}
        <div>
          <label htmlFor="target-node" className="block text-sm font-medium text-gray-700">
            Target Node *
          </label>
          <select
            id="target-node"
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            disabled={isSubmitting}
            required
          >
            <option value="">Select a target node...</option>
            {targetOptions.map((target) => (
              <option key={target.id} value={target.id}>
                {target.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Label (Optional) */}
        <div>
          <label htmlFor="custom-label" className="block text-sm font-medium text-gray-700">
            Custom Label <span className="text-gray-500">(optional)</span>
          </label>
          <input
            id="custom-label"
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder={selectedRelationshipType?.label || 'Relationship label'}
            disabled={isSubmitting}
            maxLength={50}
          />
        </div>

        {/* Relationship Preview */}
        {selectedTargetId && (
          <div className="bg-gray-50 border border-gray-200 rounded p-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Relationship Preview:</h4>
            <div className="flex items-center text-sm text-gray-700">
              <span className="font-medium">{sourceNodeLabel}</span>
              <span className="mx-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-1 ${
                    selectedRelationshipType?.color === 'red' ? 'bg-red-500' :
                    selectedRelationshipType?.color === 'blue' ? 'bg-blue-500' :
                    selectedRelationshipType?.color === 'green' ? 'bg-green-500' :
                    selectedRelationshipType?.color === 'orange' ? 'bg-orange-500' :
                    selectedRelationshipType?.color === 'purple' ? 'bg-purple-500' :
                    'bg-gray-500'
                  }`}
                />
                {selectedRelationshipType?.label.toLowerCase()}
              </span>
              <span className="font-medium">
                {targetOptions.find(t => t.id === selectedTargetId)?.label}
              </span>
            </div>
          </div>
        )}

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
            disabled={isSubmitting || !selectedTargetId}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Relationship'}
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

// Color indicator for relationship types (reusable component)
export function RelationshipTypeIndicator({
  type,
  size = 'sm'
}: {
  type: RelationshipType;
  size?: 'sm' | 'md' | 'lg';
}) {
  const relationshipType = RELATIONSHIP_TYPES.find(rt => rt.type === type);
  if (!relationshipType) return null;

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <span
      className={`inline-block rounded-full ${sizeClasses[size]} ${
        relationshipType.color === 'red' ? 'bg-red-500' :
        relationshipType.color === 'blue' ? 'bg-blue-500' :
        relationshipType.color === 'green' ? 'bg-green-500' :
        relationshipType.color === 'orange' ? 'bg-orange-500' :
        relationshipType.color === 'purple' ? 'bg-purple-500' :
        'bg-gray-500'
      }`}
      title={relationshipType.label}
    />
  );
}