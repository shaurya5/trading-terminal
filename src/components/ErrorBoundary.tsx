'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    // Report to Sentry if configured
    import('@/lib/sentry').then(({ captureException }) => {
      captureException(error, { componentStack: errorInfo.componentStack ?? undefined });
    }).catch(() => {});
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || 'Something went wrong';

      return (
        <div
          className="flex flex-col items-center justify-center h-full w-full"
          style={{ backgroundColor: '#0a0e17' }}
        >
          <div className="flex flex-col items-center gap-3 max-w-md px-6 py-8">
            {/* Error icon */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(239, 83, 80, 0.15)' }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 6V10M10 14H10.01M18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10Z"
                  stroke="#ef5350"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h3
              className="text-sm font-medium"
              style={{ color: '#e1e4e8' }}
            >
              {title}
            </h3>

            <p
              className="text-xs text-center leading-relaxed"
              style={{ color: '#8a8f98' }}
            >
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={this.handleReset}
                className="px-3 py-1.5 text-xs rounded transition-colors"
                style={{
                  backgroundColor: '#1a1e2e',
                  color: '#e1e4e8',
                  border: '1px solid #2d333b',
                }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-3 py-1.5 text-xs rounded transition-colors"
                style={{
                  backgroundColor: '#ef5350',
                  color: '#ffffff',
                  border: 'none',
                }}
              >
                Reload
              </button>
            </div>

            {/* Collapsible error details */}
            {this.state.error && (
              <div className="w-full mt-3">
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-wider transition-colors"
                  style={{ color: '#6e7681' }}
                >
                  <span
                    className="inline-block transition-transform"
                    style={{
                      transform: this.state.showDetails ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}
                  >
                    &#9654;
                  </span>
                  Error Details
                </button>
                {this.state.showDetails && (
                  <pre
                    className="mt-2 p-3 rounded text-[10px] font-mono overflow-auto max-h-40 leading-relaxed"
                    style={{
                      backgroundColor: '#070a10',
                      color: '#8a8f98',
                      border: '1px solid #1a1e2e',
                    }}
                  >
                    {this.state.error.stack || this.state.error.message}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
