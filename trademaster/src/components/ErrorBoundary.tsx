import React from 'react';
import { AlertTriangle, RotateCcw, Copy, Check } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, copied: false };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.props.onReset?.();
    window.location.reload();
  };

  handleCopy = () => {
    const { error } = this.state;
    if (!error) return;
    const text = `${error.name}: ${error.message}\n\n${error.stack || ''}`;
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const { error, copied } = this.state;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Algo deu errado</h3>
          <p className="text-slate-400 text-sm mb-4 max-w-md">
            Ocorreu um erro inesperado. Clique em "Tentar novamente" para recarregar a página.
          </p>
          {error && (
            <div className="mb-6 w-full max-w-md text-left">
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 flex items-start justify-between gap-2">
                <p className="text-xs text-red-300 font-mono break-all leading-relaxed flex-1">
                  <span className="font-bold">{error.name}:</span> {error.message}
                </p>
                <button
                  onClick={this.handleCopy}
                  title="Copiar erro"
                  className="shrink-0 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
