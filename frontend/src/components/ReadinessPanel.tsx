'use client';

import React, { useState } from 'react';
import { useReadinessStore, ReadinessState, aggregateChildReadiness, calculatePercentage } from '@/stores/readinessStore';
import ReadinessIndicator from './ReadinessIndicator';
import ReadinessForm from './ReadinessForm';

interface ReadinessPanelProps {
  onClose?: () => void;
}

type TabType = 'current' | 'history' | 'bulk';

const ReadinessPanel: React.FC<ReadinessPanelProps> = ({ onClose }) => {
  const {
    panelOpen,
    selectedNodes,
    readinessData,
    displayMode,
    setPanelOpen,
    clearSelection,
  } = useReadinessStore();

  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [showForm, setShowForm] = useState(false);

  // Get selected readiness data
  const selectedReadinessData = Array.from(selectedNodes)
    .map(nodeId => readinessData.get(nodeId))
    .filter((data): data is ReadinessState => data !== undefined);

  // Calculate aggregate readiness for multiple selections
  const aggregateReadiness = selectedReadinessData.length > 1
    ? aggregateChildReadiness(selectedReadinessData)
    : selectedReadinessData[0] || null;

  const handleClose = () => {
    setPanelOpen(false);
    clearSelection();
    setShowForm(false);
    if (onClose) onClose();
  };

  const handleFormSave = () => {
    setShowForm(false);
  };

  if (!panelOpen || selectedNodes.size === 0) {
    return null;
  }

  const isBulkMode = selectedNodes.size > 1;
  const primaryNodeId = Array.from(selectedNodes)[0];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-25 z-40"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {isBulkMode ? `${selectedNodes.size} Nodes Selected` : 'Node Readiness'}
            </h2>
            {aggregateReadiness && (
              <ReadinessIndicator
                readiness={{ ...aggregateReadiness, nodeId: 'aggregate' }}
                variant="medium"
                displayMode={displayMode}
              />
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'current'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Current
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            History
          </button>
          {isBulkMode && (
            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'bulk'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Bulk Edit
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'current' && (
            <div className="p-4 space-y-6">
              {/* Node(s) Information */}
              {isBulkMode ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Nodes</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedReadinessData.map((data) => (
                      <div key={data.nodeId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-900 truncate">{data.nodeId}</span>
                        <ReadinessIndicator
                          readiness={data}
                          variant="small"
                          displayMode={displayMode}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Node ID</h3>
                  <p className="text-sm text-gray-900 font-mono">{primaryNodeId}</p>
                </div>
              )}

              {/* Aggregate Progress */}
              {aggregateReadiness && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    {isBulkMode ? 'Aggregate Progress' : 'Progress'}
                  </h3>
                  <div className="flex items-center justify-center mb-4">
                    <ReadinessIndicator
                      readiness={{ ...aggregateReadiness, nodeId: 'display' }}
                      variant="large"
                      displayMode={displayMode}
                    />
                  </div>
                </div>
              )}

              {/* Dimensions Breakdown */}
              {aggregateReadiness && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Dimensions</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'design', label: 'Design' },
                      { key: 'backend', label: 'Backend' },
                      { key: 'frontend', label: 'Frontend' },
                      { key: 'integration', label: 'Integration' },
                      { key: 'test', label: 'Test' },
                      { key: 'deployment', label: 'Deployment' },
                    ].map((dimension) => {
                      const value = aggregateReadiness[dimension.key as keyof ReadinessState] as number;
                      const color = value >= 80 ? 'bg-green-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500';

                      return (
                        <div key={dimension.key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-900">{dimension.label}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${color} transition-all duration-300`}
                                style={{ width: `${value}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 w-8 text-right">{value}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dependencies (placeholder) */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Dependencies</h3>
                <div className="text-sm text-gray-500 text-center py-4">
                  Dependency visualization coming soon
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-4">
              <div className="text-sm text-gray-500 text-center py-8">
                Readiness history timeline coming soon
              </div>
            </div>
          )}

          {activeTab === 'bulk' && isBulkMode && (
            <div className="p-4">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Bulk Update</h4>
                  <p className="text-sm text-blue-700">
                    Changes will be applied to all {selectedNodes.size} selected nodes.
                    Individual validation rules still apply.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Common Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="p-2 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors">
                      Mark All Complete
                    </button>
                    <button className="p-2 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors">
                      Set In Progress
                    </button>
                    <button className="p-2 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors">
                      Reset All
                    </button>
                    <button className="p-2 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors">
                      Custom Update
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-between">
            <div className="flex space-x-2">
              <button
                onClick={handleClose}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
              {!isBulkMode && (
                <button className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors">
                  Export Report
                </button>
              )}
            </div>
            <div className="flex space-x-2">
              {selectedReadinessData.length > 0 && (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {isBulkMode ? `Update ${selectedNodes.size} Nodes` : 'Update Readiness'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && primaryNodeId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <ReadinessForm
            nodeId={primaryNodeId}
            isBulkMode={isBulkMode}
            selectedNodeIds={Array.from(selectedNodes)}
            onClose={() => setShowForm(false)}
            onSave={handleFormSave}
          />
        </div>
      )}
    </>
  );
};

export default ReadinessPanel;