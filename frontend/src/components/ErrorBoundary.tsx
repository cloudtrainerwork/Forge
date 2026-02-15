'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div style={{
            padding: '20px',
            background: '#ef4444',
            color: 'white',
            borderRadius: '8px',
            margin: '20px'
          }}>
            <h3>Something went wrong</h3>
            <p>{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                background: 'white',
                color: '#ef4444',
                border: 'none',
                borderRadius: '4px',
                marginTop: '10px',
                cursor: 'pointer'
              }}
            >
              Refresh Page
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;