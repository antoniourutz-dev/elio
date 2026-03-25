import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { validateEnv } from './env.ts';
import './index.css';

const env = validateEnv();
if (!env.ok) {
  console.error('[Elio] Missing required environment variables:', env.missing.join(', '));
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion={import.meta.env.DEV ? 'never' : 'user'}>
        <App />
      </MotionConfig>
    </ErrorBoundary>
  </React.StrictMode>
);
