'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useNavigationStore } from '@/stores/navigationStore';
import BreadcrumbNav from '@/components/BreadcrumbNav';

// Dynamic import for the ReactFlow FORGE graph
const ForgeGraph = dynamic(
  () => import('@/components/ForgeGraphReactFlow'),
  { ssr: false }
);

// Dynamic import for detailed view
const ForgeDetailView = dynamic(
  () => import('@/components/ForgeDetailView'),
  { ssr: false }
);

export default function Home() {
  const [view, setView] = useState<'workflow' | 'sprint' | 'executive'>('workflow');
  const { currentLevel, currentNodeId, breadcrumbs } = useNavigationStore();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">FORGE</h1>
              <p className="text-xs text-gray-500">Functional Orchestration for Release-Grade Execution</p>
            </div>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('workflow')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'workflow'
                ? 'bg-orange-100 text-orange-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Workflow Diagram
          </button>
          <button
            onClick={() => setView('sprint')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'sprint'
                ? 'bg-orange-100 text-orange-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Sprint Planning
          </button>
          <button
            onClick={() => setView('executive')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'executive'
                ? 'bg-orange-100 text-orange-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Executive Review
          </button>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      {currentLevel !== 'project' && <BreadcrumbNav />}

      {/* Main Content */}
      <main className="flex-1 relative">
        {view === 'workflow' && (
          currentLevel === 'detail' && currentNodeId ? (
            <ForgeDetailView
              screenId={currentNodeId}
              screenName={breadcrumbs[breadcrumbs.length - 1]?.label || 'Screen Detail'}
            />
          ) : (
            <ForgeGraph />
          )
        )}

        {view === 'sprint' && (
          <div className="p-8">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Sprint Planning</h2>

              {/* Sprint Swimlanes */}
              <div className="space-y-4">
                {/* Ready for Sprint */}
                <div className="bg-white rounded-lg border border-green-200 p-4">
                  <h3 className="font-semibold text-green-700 mb-3">Ready for Sprint (80%+ Complete)</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="font-medium">Login Screen</div>
                      <div className="text-sm text-gray-600 mt-1">All dimensions ready</div>
                      <div className="flex gap-1 mt-2">
                        {[100, 100, 80, 60, 40, 20].map((v, i) => (
                          <div key={i} className="w-4 h-2 bg-green-500 rounded-sm" style={{ opacity: v / 100 }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* On the Bubble */}
                <div className="bg-white rounded-lg border border-yellow-200 p-4">
                  <h3 className="font-semibold text-yellow-700 mb-3">On the Bubble (40-79% Complete)</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="font-medium">Balance Due Screen</div>
                      <div className="text-sm text-gray-600 mt-1">Backend integration pending</div>
                      <div className="flex gap-1 mt-2">
                        {[100, 100, 60, 40, 20, 0].map((v, i) => (
                          <div key={i} className="w-4 h-2 bg-yellow-500 rounded-sm" style={{ opacity: v / 100 || 0.1 }} />
                        ))}
                      </div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="font-medium">Billing Service</div>
                      <div className="text-sm text-gray-600 mt-1">Facets API integration needed</div>
                      <div className="flex gap-1 mt-2">
                        {[100, 60, 0, 40, 20, 0].map((v, i) => (
                          <div key={i} className="w-4 h-2 bg-yellow-500 rounded-sm" style={{ opacity: v / 100 || 0.1 }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Not Ready */}
                <div className="bg-white rounded-lg border border-red-200 p-4">
                  <h3 className="font-semibold text-red-700 mb-3">Not Ready (&lt;40% Complete)</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="font-medium">Payment Entry Screen</div>
                      <div className="text-sm text-gray-600 mt-1">Design incomplete</div>
                      <div className="flex gap-1 mt-2">
                        {[100, 80, 40, 20, 0, 0].map((v, i) => (
                          <div key={i} className="w-4 h-2 bg-red-500 rounded-sm" style={{ opacity: v / 100 || 0.1 }} />
                        ))}
                      </div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="font-medium">Payment Service</div>
                      <div className="text-sm text-gray-600 mt-1">Requirements not finalized</div>
                      <div className="flex gap-1 mt-2">
                        {[80, 40, 0, 20, 0, 0].map((v, i) => (
                          <div key={i} className="w-4 h-2 bg-red-500 rounded-sm" style={{ opacity: v / 100 || 0.1 }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'executive' && (
          <div className="p-8">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Executive Review Dashboard</h2>

              <div className="grid grid-cols-3 gap-6">
                {/* Overall Progress */}
                <div className="bg-white rounded-lg p-6 shadow-sm border">
                  <h3 className="font-semibold text-gray-700 mb-4">Overall Progress</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Requirements</span>
                        <span className="font-medium">95%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-green-500 rounded-full" style={{ width: '95%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Design</span>
                        <span className="font-medium">78%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-yellow-500 rounded-full" style={{ width: '78%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Frontend</span>
                        <span className="font-medium">45%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-yellow-500 rounded-full" style={{ width: '45%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Backend</span>
                        <span className="font-medium">38%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-red-500 rounded-full" style={{ width: '38%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Integration</span>
                        <span className="font-medium">22%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-red-500 rounded-full" style={{ width: '22%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Testing</span>
                        <span className="font-medium">15%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-red-500 rounded-full" style={{ width: '15%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Commitment Status */}
                <div className="bg-white rounded-lg p-6 shadow-sm border">
                  <h3 className="font-semibold text-gray-700 mb-4">Commitment Status</h3>
                  <div className="space-y-2">
                    <div className="p-2 bg-green-50 rounded border-l-4 border-green-500">
                      <div className="font-medium text-sm">Committed Items</div>
                      <div className="text-xs text-gray-600">Ready for sprint delivery</div>
                      <div className="text-lg font-bold text-green-600 mt-1">8 items</div>
                    </div>
                    <div className="p-2 bg-yellow-50 rounded border-l-4 border-yellow-500">
                      <div className="font-medium text-sm">On the Bubble</div>
                      <div className="text-xs text-gray-600">May or may not make sprint</div>
                      <div className="text-lg font-bold text-yellow-600 mt-1">12 items</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border-l-4 border-gray-500">
                      <div className="font-medium text-sm">Deferred</div>
                      <div className="text-xs text-gray-600">Pushed to future sprint</div>
                      <div className="text-lg font-bold text-gray-600 mt-1">5 items</div>
                    </div>
                  </div>
                </div>

                {/* Sprint Velocity */}
                <div className="bg-white rounded-lg p-6 shadow-sm border">
                  <h3 className="font-semibold text-gray-700 mb-4">Sprint Velocity</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Items Ready</span>
                      <span className="font-bold text-green-600">8</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">On the Bubble</span>
                      <span className="font-bold text-yellow-600">12</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Blocked</span>
                      <span className="font-bold text-red-600">5</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Items</span>
                      <span className="font-bold">25</span>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded">
                      <div className="text-sm font-medium text-blue-900">Projected Completion</div>
                      <div className="text-2xl font-bold text-blue-600">Sprint 14</div>
                      <div className="text-xs text-blue-700">Based on current velocity</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}