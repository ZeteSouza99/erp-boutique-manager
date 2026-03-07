'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logError, getErrorMessage, isOperationalError } from '@/lib/errors';

// ==========================================
// TIPOS
// ==========================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// ==========================================
// ERROR BOUNDARY CLASS COMPONENT
// ==========================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log do erro
    logError(error, {
      componentStack: errorInfo.componentStack,
    });

    // Callback customizado
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails = false } = this.props;

    if (hasError) {
      // Usar fallback customizado se fornecido
      if (fallback) {
        return fallback;
      }

      const isOperational = error ? isOperationalError(error) : false;
      const errorMessage = error ? getErrorMessage(error) : 'Erro desconhecido';

      return (
        <div className="min-h-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">
                {isOperational ? 'Ops! Algo deu errado' : 'Erro inesperado'}
              </h2>
              <p className="text-gray-600">
                {errorMessage}
              </p>
            </div>

            {showDetails && errorInfo && process.env.NODE_ENV === 'development' && (
              <details className="text-left bg-gray-50 rounded-lg p-4 text-sm">
                <summary className="cursor-pointer font-medium text-gray-700">
                  Detalhes técnicos
                </summary>
                <pre className="mt-2 overflow-auto text-xs text-gray-600 whitespace-pre-wrap">
                  {error?.stack}
                  {'\n\nComponent Stack:'}
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </Button>
              <Button
                variant="default"
                onClick={this.handleGoHome}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Ir para Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// ==========================================
// ERROR FALLBACK COMPONENT
// ==========================================

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  title?: string;
  description?: string;
}

export function ErrorFallback({
  error,
  resetError,
  title = 'Algo deu errado',
  description,
}: ErrorFallbackProps) {
  const errorMessage = description || (error ? getErrorMessage(error) : 'Tente novamente mais tarde.');

  return (
    <div className="min-h-50 flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div className="space-y-1">
          <h3 className="font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{errorMessage}</p>
        </div>
        {resetError && (
          <Button variant="outline" size="sm" onClick={resetError}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        )}
      </div>
    </div>
  );
}

// ==========================================
// PAGE ERROR COMPONENT
// ==========================================

interface PageErrorProps {
  title?: string;
  description?: string;
  showHomeButton?: boolean;
  showReloadButton?: boolean;
}

export function PageError({
  title = 'Página não encontrada',
  description = 'A página que você está procurando não existe ou foi movida.',
  showHomeButton = true,
  showReloadButton = false,
}: PageErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-8xl font-bold text-gray-200">404</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <p className="text-gray-600">{description}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {showReloadButton && (
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar
            </Button>
          )}
          {showHomeButton && (
            <Button
              variant="default"
              onClick={() => (window.location.href = '/dashboard')}
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Voltar ao início
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// NETWORK ERROR COMPONENT
// ==========================================

interface NetworkErrorProps {
  onRetry?: () => void;
}

export function NetworkError({ onRetry }: NetworkErrorProps) {
  return (
    <div className="min-h-50 flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-yellow-600" />
        </div>
        <div className="space-y-1">
          <h3 className="font-medium text-gray-900">Sem conexão</h3>
          <p className="text-sm text-gray-600">
            Verifique sua conexão com a internet e tente novamente.
          </p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        )}
      </div>
    </div>
  );
}
