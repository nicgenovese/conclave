"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="card py-6 my-6">
          <div className="flex items-start gap-3 px-6">
            <span className="inline-block h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0 bg-copper" />
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold text-moria-black">
                Something went wrong
              </h3>
              <p className="font-mono text-[13px] mt-1 break-words text-moria-dim">
                {this.state.error?.message || "An unexpected error occurred."}
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="mt-4 px-4 py-2 rounded-lg bg-moria-black text-white text-[13px] hover:opacity-90 transition-opacity"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
