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
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 my-6">
          <div className="flex items-start gap-3">
            <div className="h-2 w-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                Something went wrong
              </h3>
              <p className="text-sm text-muted-foreground mt-1 break-words font-mono">
                {this.state.error?.message || "An unexpected error occurred."}
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="mt-4 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
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
