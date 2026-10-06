import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 text-white backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">
              {this.props.fallbackTitle || 'Ocurrió un error inesperado'}
            </h3>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || 'Error al cargar la vista'}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 mx-auto shadow-md active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Cerrar y continuar</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
