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
        <div className="py-6 my-6" style={{ borderTop: "0.5px solid var(--rule)", borderBottom: "0.5px solid var(--rule)" }}>
          <div className="flex items-start gap-3">
            <span
              className="inline-block h-2 w-2 rounded-full mt-1.5 flex-shrink-0"
              style={{ background: "var(--copper)" }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-[15px] font-semibold" style={{ color: "var(--black)" }}>
                Something went wrong
              </h3>
              <p className="font-mono text-[13px] mt-1 break-words" style={{ color: "var(--dim)" }}>
                {this.state.error?.message || "An unexpected error occurred."}
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="mt-4 px-3 py-1.5 font-serif text-[13px]"
                style={{
                  background: "var(--black)",
                  color: "var(--white)",
                  border: "none",
                }}
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
