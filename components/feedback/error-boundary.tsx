'use client';

import * as React from 'react';

import {ErrorFallback} from '@/components/feedback/error-fallback';
import {logError} from '@/lib/logging/error-logger';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{error: Error; reset: () => void}>;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {error: null};
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {error};
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logError(error, info.componentStack ?? undefined);
  }

  reset = () => {
    this.setState({error: null});
  };

  render() {
    const {error} = this.state;
    const {children, fallback: Fallback = ErrorFallback} = this.props;

    if (error) {
      return <Fallback error={error} reset={this.reset} />;
    }

    return children;
  }
}

export {ErrorBoundary};
