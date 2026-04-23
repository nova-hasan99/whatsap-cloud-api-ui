import { Component, type ReactNode } from 'react';

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(e: Error): State {
    return { error: e };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, '\n', error.stack, '\n', info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 shadow">
            <h2 className="mb-2 text-lg font-bold text-red-700">Something went wrong</h2>
            <p className="mb-1 text-sm font-medium text-red-600">{error.message}</p>
            <pre className="mt-2 max-h-48 overflow-auto rounded bg-red-100 p-3 text-left text-xs text-red-800">
              {error.stack}
            </pre>
            <button
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              className="mt-4 rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
