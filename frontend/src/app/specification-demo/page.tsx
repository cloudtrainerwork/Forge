'use client';

import React, { useState } from 'react';
import SpecificationEditor from '../../components/specifications/SpecificationEditor';

// Demo work items for testing
const DEMO_WORK_ITEMS = [
  {
    id: 'login-screen',
    title: 'Login Screen',
    description: 'User authentication interface with email/password',
  },
  {
    id: 'balance-due',
    title: 'Balance Due Screen',
    description: 'Display current balance and payment options',
  },
  {
    id: 'payment-entry',
    title: 'Payment Entry Screen',
    description: 'Credit card and ACH payment form',
  },
  {
    id: 'auth-service',
    title: 'Auth Service',
    description: 'SiteMinder integration service',
  },
  {
    id: 'billing-service',
    title: 'Billing Service',
    description: 'Facets real-time API integration',
  },
];

export default function SpecificationDemo() {
  const [selectedWorkItem, setSelectedWorkItem] = useState(DEMO_WORK_ITEMS[0]);
  const [editorVariant, setEditorVariant] = useState<'full' | 'compact' | 'modal'>('full');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">F</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">FORGE</h1>
                  <p className="text-xs text-gray-500">Specification Editor Demo</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Variant Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">View:</label>
                <select
                  value={editorVariant}
                  onChange={(e) => setEditorVariant(e.target.value as 'full' | 'compact' | 'modal')}
                  className="px-3 py-1 border rounded text-sm"
                >
                  <option value="full">Full</option>
                  <option value="compact">Compact</option>
                  <option value="modal">Modal</option>
                </select>
              </div>

              {/* Work Item Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Work Item:</label>
                <select
                  value={selectedWorkItem.id}
                  onChange={(e) => {
                    const item = DEMO_WORK_ITEMS.find(item => item.id === e.target.value);
                    if (item) setSelectedWorkItem(item);
                  }}
                  className="px-3 py-1 border rounded text-sm"
                >
                  {DEMO_WORK_ITEMS.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>

              <a
                href="/"
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                ← Back to FORGE
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Specification Editor Demo
          </h2>
          <p className="text-gray-600">
            Editing specification for: <strong>{selectedWorkItem.title}</strong>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {selectedWorkItem.description}
          </p>
        </div>

        {/* Specification Editor */}
        <div className="space-y-6">
          {editorVariant !== 'modal' ? (
            <div className={editorVariant === 'compact' ? 'max-w-4xl' : 'w-full'}>
              <SpecificationEditor
                workItemId={selectedWorkItem.id}
                variant={editorVariant}
                className="w-full"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setEditorVariant('full')}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Open Modal Editor
              </button>

              {/* This would typically be triggered by a state change */}
              <SpecificationEditor
                workItemId={selectedWorkItem.id}
                variant="modal"
                onClose={() => setEditorVariant('full')}
              />
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Testing Instructions
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Features to Test:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Edit specification sections (Requirements, Design, Frontend, Backend, Integration, Test)</li>
                <li>• Auto-save functionality (500ms debounce after typing stops)</li>
                <li>• Real-time word count and status calculation</li>
                <li>• Section navigation via sidebar or tabs</li>
                <li>• Overall completion progress tracking</li>
                <li>• Form validation and error handling</li>
                <li>• Visual status indicators (empty → draft → review → complete)</li>
                <li>• Responsive design across different screen sizes</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Expected Behavior:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Content saves automatically after stopping typing</li>
                <li>• Status indicators update immediately as content is added</li>
                <li>• Progress bar reflects overall completion percentage</li>
                <li>• Keyboard shortcuts work (Ctrl+Tab for section switching)</li>
                <li>• Specification data persists separately from canvas state</li>
                <li>• Form validation displays appropriate error messages</li>
                <li>• Save status shows "Saving..." then "Saved [time]"</li>
                <li>• Different work items maintain separate specification data</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
            <p className="text-sm text-orange-700">
              <strong>Note:</strong> This demo uses mock work item IDs. The specification data will be stored
              in the backend and should persist between page refreshes. Switch between different work items
              to see how each maintains its own specification state.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}