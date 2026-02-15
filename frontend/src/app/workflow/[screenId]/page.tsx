'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import BreadcrumbNav from '@/components/BreadcrumbNav';

// Dynamic import for enhanced detailed view with CRUD functionality
const ForgeDetailView = dynamic(
  () => import('@/components/ForgeDetailViewEnhanced'),
  { ssr: false }
);

interface PageProps {
  params: { screenId: string };
}

export default function ScreenDetailPage({ params }: PageProps) {
  const { screenId } = params;

  // Convert screenId to readable name (e.g., login-screen -> Login Screen)
  const screenName = screenId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

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

        {/* Share button */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
          }}
          className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors"
        >
          Share Link 📋
        </button>
      </header>

      {/* Breadcrumb Navigation */}
      <BreadcrumbNav />

      {/* Main Content */}
      <main className="flex-1 relative">
        <ForgeDetailView
          screenId={screenId}
          screenName={screenId
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')}
        />
      </main>
    </div>
  );
}