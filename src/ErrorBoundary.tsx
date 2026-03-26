import { Component, type ReactNode, type ErrorInfo } from 'react';
import { RotateCcw } from 'lucide-react';
import { logError } from './lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError('ErrorBoundary', error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-[1000] bg-[#f7fbfe]/98 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white border border-[#e1e5ee] rounded-[32px] p-8 max-w-[400px] w-full shadow-[0_24px_64px_rgba(100,140,160,0.15)] grid gap-5">
            <div className="mx-auto w-14 h-14 rounded-full bg-red-50 text-red-500 font-display text-2xl font-black flex items-center justify-center">!</div>
            <h1 className="font-display text-2xl font-black tracking-tight text-[var(--text)] m-0">Zerbait gaizki joan da</h1>
            <p className="text-[0.92rem] font-bold text-[var(--muted)] leading-relaxed m-0 break-words">{this.state.error.message}</p>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2.5 min-h-[52px] px-6 rounded-full font-black text-white bg-gradient-to-br from-[#69b7da] via-[#62cdbf] to-[#dce97f] shadow-[0_18px_36px_rgba(103,201,190,0.18)] cursor-pointer transition-transform hover:-translate-y-0.5 mt-2"
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="w-5 h-5" />
              <span>Berrabiarazi</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
