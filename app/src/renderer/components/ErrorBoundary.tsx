import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-hytale-darker p-8">
          <div className="max-w-md w-full bg-hytale-dark border border-hytale-accent/30 rounded-lg p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-hytale-text mb-2">Something went wrong</h2>
            <p className="text-sm text-hytale-muted mb-4">
              An unexpected error occurred. Please reload the application.
            </p>
            {this.state.error && (
              <div className="bg-hytale-darker rounded p-3 mb-4 text-left overflow-auto max-h-32">
                <p className="text-xs text-hytale-highlight font-mono break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-2 rounded bg-hytale-highlight hover:bg-hytale-highlight/80 text-white font-medium transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
