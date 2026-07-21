import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level error boundary: with Three.js and OpenCascade/WASM pages in the
 * tree, a render-time throw would otherwise unmount the whole app to a blank
 * white screen with no way to recover.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-[#f8fafc] px-4 text-center">
        <h1 className="text-[20px] font-bold leading-7 text-[#181c20]">Something went wrong</h1>
        <p className="max-w-[480px] text-[14px] leading-5 text-[#6b7280]">
          An unexpected error occurred while rendering this page.
        </p>
        <pre className="max-w-[640px] overflow-x-auto rounded-md bg-white px-4 py-3 text-left text-[12px] text-[#dc2626]">
          {this.state.error.message}
        </pre>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null });
            window.location.href = '/';
          }}
          className="inline-flex h-9 items-center justify-center rounded-md bg-[#006496] px-4 py-2 text-[14px] font-medium text-[#fafafa] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#005580]"
        >
          Back to dashboard
        </button>
      </div>
    );
  }
}
