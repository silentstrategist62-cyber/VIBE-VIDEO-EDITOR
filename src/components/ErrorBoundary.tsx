import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndReload = () => {
    try {
      localStorage.removeItem('autonomous_editor_skills_v1');
      localStorage.removeItem('editor_last_project_state');
    } catch {
      // Ignored
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans select-none">
          <div className="max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-3 text-amber-400 mb-4">
              <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-100">Editor Encountered an Issue</h1>
                <p className="text-xs text-slate-400">Application recovery handler</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              The video editor detected an unexpected runtime condition. You can reload the application or reset stored preferences to restore workspace state.
            </p>

            {this.state.error && (
              <div className="mb-5 p-3 bg-slate-950 border border-slate-800 rounded-lg overflow-x-auto max-h-36 text-xs font-mono text-red-300">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Editor
              </button>
              <button
                onClick={this.handleResetAndReload}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors border border-slate-700"
                title="Reset cache and reload"
              >
                <Trash2 className="w-4 h-4 text-slate-400" />
                Reset &amp; Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
