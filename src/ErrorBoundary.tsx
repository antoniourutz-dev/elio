import { Component, type ReactNode, type ErrorInfo } from 'react';
import { RotateCcw } from 'lucide-react';

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
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary-view">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">!</div>
            <h1 className="error-boundary-title">Zerbait gaizki joan da</h1>
            <p className="error-boundary-message">{this.state.error.message}</p>
            <button
              type="button"
              className="error-boundary-button"
              onClick={() => window.location.reload()}
            >
              <RotateCcw />
              <span>Berrabiarazi</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
