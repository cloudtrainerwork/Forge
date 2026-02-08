'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for GraphCanvas DOM cleanup issues
 * Prevents Cytoscape DOM conflicts from crashing the entire app
 */
class GraphCanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error('GraphCanvas Error Boundary caught an error:', error, errorInfo);

    // Always auto-recover from any GraphCanvas error to prevent app crashes
    console.warn('GraphCanvas error - auto-recovering...');

    // Auto-recover immediately for better UX
    setTimeout(() => {
      this.setState({ hasError: false, error: null });
    }, 50);
  }

  render() {
    if (this.state.hasError) {
      // Show minimal fallback UI during recovery
      return (
        <div className="w-full h-full bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-sm">Graph Canvas Recovering...</div>
            <div className="text-xs mt-1">Reloading in a moment</div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GraphCanvasErrorBoundary;