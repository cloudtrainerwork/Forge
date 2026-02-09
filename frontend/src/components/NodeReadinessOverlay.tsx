'use client';

import React from 'react';
import { useReadinessStore } from '@/stores/readinessStore';
import ReadinessIndicator from './ReadinessIndicator';

interface NodeReadinessOverlayProps {
  nodeId: string;
  nodeType?: 'screen' | 'service' | 'component' | 'api' | 'database' | 'other';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  onOpenForm?: (nodeId: string) => void;
  className?: string;
}

const NodeReadinessOverlay: React.FC<NodeReadinessOverlayProps> = ({
  nodeId,
  nodeType = 'other',
  position = 'top-right',
  onOpenForm,
  className = '',
}) => {
  const {
    readinessData,
    displayMode,
    selectedNodes,
    loading,
    errors,
    toggleNodeSelection,
    setPanelOpen,
  } = useReadinessStore();

  const readiness = readinessData.get(nodeId);
  const isSelected = selectedNodes.has(nodeId);
  const isLoading = loading.get(nodeId) || false;
  const hasError = errors.has(nodeId);
  const errorMessage = errors.get(nodeId);

  // Don't render if no readiness data
  if (!readiness) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onOpenForm) {
      onOpenForm(nodeId);
    } else {
      setPanelOpen(true);
      toggleNodeSelection(nodeId);
    }
  };

  // Position classes
  const positionClasses = {
    'top-right': 'absolute -top-2 -right-2',
    'top-left': 'absolute -top-2 -left-2',
    'bottom-right': 'absolute -bottom-2 -right-2',
    'bottom-left': 'absolute -bottom-2 -left-2',
  };

  // Node type specific styling
  const getNodeTypeStyle = () => {
    switch (nodeType) {
      case 'screen':
        return 'border border-blue-300 shadow-blue-100';
      case 'service':
        return 'border border-green-300 shadow-green-100';
      case 'component':
        return 'border border-purple-300 shadow-purple-100';
      case 'api':
        return 'border border-orange-300 shadow-orange-100';
      case 'database':
        return 'border border-gray-300 shadow-gray-100';
      default:
        return 'border border-gray-200 shadow-gray-100';
    }
  };

  const overlayClass = `
    ${positionClasses[position]}
    z-10 transition-all duration-200
    ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 rounded-full' : ''}
    ${nodeType !== 'other' ? 'rounded-full bg-white shadow-sm ' + getNodeTypeStyle() : ''}
    ${className}
  `;

  return (
    <div className={overlayClass}>
      <ReadinessIndicator
        readiness={readiness}
        variant="small"
        displayMode={displayMode}
        onClick={handleClick}
        showHover={true}
        isLoading={isLoading}
        hasError={hasError}
        className="hover:scale-110 transition-transform duration-200"
      />

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -inset-1 border-2 border-blue-500 rounded-full animate-pulse"></div>
      )}

      {/* Error tooltip */}
      {hasError && errorMessage && (
        <div className="absolute z-20 bg-red-600 text-white text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap pointer-events-none"
             style={{
               bottom: position.includes('top') ? 'auto' : '100%',
               top: position.includes('bottom') ? 'auto' : '100%',
               left: position.includes('right') ? 'auto' : '0',
               right: position.includes('left') ? 'auto' : '0',
               marginBottom: position.includes('top') ? '0' : '4px',
               marginTop: position.includes('bottom') ? '0' : '4px',
             }}>
          {errorMessage}
          <div
            className="absolute border-2 border-transparent"
            style={{
              top: position.includes('top') ? '100%' : 'auto',
              bottom: position.includes('bottom') ? '100%' : 'auto',
              left: position.includes('right') ? 'auto' : '8px',
              right: position.includes('left') ? 'auto' : '8px',
              borderTopColor: position.includes('bottom') ? '#DC2626' : 'transparent',
              borderBottomColor: position.includes('top') ? '#DC2626' : 'transparent',
            }}
          />
        </div>
      )}

      {/* Updating indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 rounded-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-3 w-3 border border-gray-500 border-t-transparent"></div>
        </div>
      )}
    </div>
  );
};

export default NodeReadinessOverlay;