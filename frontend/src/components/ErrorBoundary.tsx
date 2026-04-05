import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { i18n } from '../i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * ErrorBoundary component catches rendering errors in child components
 * and displays a friendly error UI with retry functionality.
 * 
 * Note: Error Boundaries must be class components as they use
 * componentDidCatch lifecycle method.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    // Reset error state to retry rendering
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {i18n.t('errorBoundary.title')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  {i18n.t('errorBoundary.message')}
                </p>
              </div>
            </div>

            {/* Error Details */}
            <div className="p-6 space-y-4">
              {error && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                    {i18n.t('errorBoundary.details')}:
                  </h3>
                  <div className="bg-gray-100 dark:bg-zinc-800 rounded-lg p-4 border border-gray-200 dark:border-zinc-700">
                    <p className="text-sm font-mono text-rose-600 dark:text-rose-400 break-all">
                      {error.toString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Stack Trace (collapsed by default, for debugging) */}
              {errorInfo && import.meta.env.DEV && (
                <details className="space-y-2">
                  <summary className="text-sm font-semibold text-gray-700 dark:text-zinc-300 cursor-pointer hover:text-gray-900 dark:hover:text-white">
                    Component Stack
                  </summary>
                  <div className="bg-gray-100 dark:bg-zinc-800 rounded-lg p-4 border border-gray-200 dark:border-zinc-700 overflow-auto max-h-64">
                    <pre className="text-xs font-mono text-gray-600 dark:text-zinc-400 whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={this.handleReset}
                  className="flex-1 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {i18n.t('errorBoundary.retry')}
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
                >
                  {i18n.t('messages.errors.retryConnection')}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
